import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { audioManager } from '@/lib/audioManager';

const NODE_HARVEST_TABLE: Record<string, { item: string; amount: number }> = {
  palm: { item: 'driftwood', amount: 2 },
  limestone: { item: 'limestone', amount: 2 },
  obsidian: { item: 'flint', amount: 2 },
  water_spring: { item: 'palm_frond', amount: 1 },
  clearing: { item: 'palm_frond', amount: 2 }
};

export function useSimulationLoop(baseIntervalMs = 5000) {
  const isRunningRef = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastStepTriggerRef = useRef(0);
  const tickCountRef = useRef(0);

  const stepTrigger = useGameStore((s) => s.stepTrigger);
  const isPaused = useGameStore((s) => s.isPaused);
  const simSpeed = useGameStore((s) => s.simSpeed);

  const runTick = async () => {
    const state = useGameStore.getState();
    if (state.isProcessing) return;

    state.setProcessing(true);

    tickCountRef.current += 1;

    // Periodically transition weather system
    if (tickCountRef.current % 8 === 0) {
      const weathers: Array<'Clear' | 'Rain' | 'Storm' | 'Fog'> = ['Clear', 'Clear', 'Rain', 'Storm', 'Fog'];
      const nextWeather = weathers[Math.floor(Math.random() * weathers.length)];
      state.setWeather(nextWeather);
      audioManager?.updateWeatherAudio(nextWeather);
    }

    const payload = {
      day: state.day,
      time_of_day: state.timeOfDay,
      weather: state.weather,
      survivor: {
        position: state.survivorPosition,
        vitals: state.vitals,
        inventory: state.inventory
      },
      plates_discovered: state.plates.map((p) => ({ id: p.id, name: p.name, type: p.type })),
      island_nodes: state.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        distance: Number(
          Math.hypot(
            n.position[0] - state.survivorPosition[0],
            n.position[2] - state.survivorPosition[2]
          ).toFixed(2)
        )
      }))
    };

    // Environmental impacts on vitals
    let weatherTempDelta = 0;
    let weatherHydrationDelta = 0;

    if (state.weather === 'Rain') {
      weatherTempDelta = -1.2;
      weatherHydrationDelta = 4;
    } else if (state.weather === 'Storm') {
      weatherTempDelta = -2.5;
      weatherHydrationDelta = 6;
    } else if (state.timeOfDay === 'Day' && state.weather === 'Clear') {
      weatherTempDelta = 0.5;
    }

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const res = await fetch('/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const action = data?.action;

      if (!action || !isRunningRef.current) return;

      // 1. CAPTURE JOURNAL ENTRY FIRST (so it never gets skipped by early returns)
      if (action.journal_log) {
        state.addJournalEntry({
          day: state.day,
          timeOfDay: state.timeOfDay,
          weather: state.weather,
          title: action.journal_log.title,
          entry: action.journal_log.narrative,
          type: action.journal_log.type
        });
      }

      // 2. Map kinesthetic poses
      if (action.action_type === 'REST') {
        state.setSurvivorState('SLEEP');
      } else if (['FORAGE', 'BUILD', 'CRAFT', 'EXPAND_TERRAIN'].includes(action.action_type)) {
        state.setSurvivorState('CHOP');
      } else if (action.action_type === 'MOVE') {
        state.setSurvivorState('WALK');
      } else {
        state.setSurvivorState('IDLE');
      }

      // 3. Terraforming
      if (action.action_type === 'EXPAND_TERRAIN') {
        const success = state.expandNewArea('adjacent');
        if (success) {
          audioManager?.playTerraformSound();
          state.applyActionOutcome(
            action.thought_monologue,
            'Constructed a pontoon crossing and reclaimed a new islet!',
            {
              hunger: -6,
              energy: -15,
              hydration: -10 + weatherHydrationDelta,
              temperatureC: weatherTempDelta
            }
          );
        } else {
          state.applyActionOutcome(
            action.thought_monologue,
            'Attempted terraforming but lacked required timber and rock.',
            {
              hunger: -1,
              energy: -2,
              hydration: -2 + weatherHydrationDelta,
              temperatureC: weatherTempDelta
            }
          );
        }
        return;
      }

      // 4. Drinking
      if (action.action_type === 'DRINK') {
        state.applyActionOutcome(
          action.thought_monologue,
          'Drank cool freshwater to replenish hydration.',
          {
            hunger: -1,
            energy: 4,
            hydration: 45 + weatherHydrationDelta,
            temperatureC: weatherTempDelta
          }
        );
        return;
      }

      // 5. Crafting & Building
      if (action.action_type === 'CRAFT' || action.action_type === 'BUILD') {
        if (action.recipe) {
          const success = state.executeCraftOrBuild(action.recipe);
          if (success) {
            state.applyActionOutcome(
              action.thought_monologue,
              action.log_message,
              {
                hunger: -4,
                energy: -8,
                hydration: -6 + weatherHydrationDelta,
                temperatureC: weatherTempDelta,
                health: 0
              }
            );
            return;
          }
        }
        state.applyActionOutcome(
          action.thought_monologue,
          `Attempted to craft ${action.recipe ?? 'item'}, but lacked ingredients.`,
          {
            hunger: -1,
            energy: -2,
            hydration: -2 + weatherHydrationDelta,
            temperatureC: weatherTempDelta,
            health: 0
          }
        );
        return;
      }

      // 6. Harvesting
      if (action.action_type === 'FORAGE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
          state.setTargetPosition(targetNode.position);
          audioManager?.playChopSound();
          const drop = NODE_HARVEST_TABLE[targetNode.type] ?? { item: 'driftwood', amount: 1 };
          const currentCount = state.inventory[drop.item] ?? 0;
          state.applyActionOutcome(
            action.thought_monologue,
            action.log_message,
            {
              hunger: -3,
              energy: -5,
              hydration: -5 + weatherHydrationDelta,
              temperatureC: weatherTempDelta,
              health: 0
            },
            { [drop.item]: currentCount + drop.amount }
          );
          return;
        }
      }

      // 7. Locomotion
      if (action.action_type === 'MOVE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
          state.setTargetPosition(targetNode.position);
        }
        state.applyActionOutcome(
          action.thought_monologue,
          action.log_message,
          {
            hunger: -2,
            energy: -3,
            hydration: -4 + weatherHydrationDelta,
            temperatureC: weatherTempDelta,
            health: 0
          }
        );
        return;
      }

      // 8. Resting Fallback
      state.applyActionOutcome(
        action.thought_monologue,
        action.log_message,
        {
          hunger: -1,
          energy: 16,
          hydration: -2 + weatherHydrationDelta,
          temperatureC: weatherTempDelta,
          health: 2
        }
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Tick execution error:', err);
    } finally {
      if (isRunningRef.current) {
        state.setProcessing(false);
      }
    }
  };

  useEffect(() => {
    isRunningRef.current = true;

    function scheduleNext() {
      if (!isRunningRef.current) return;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

      const state = useGameStore.getState();
      if (state.isPaused) return;

      const currentInterval = baseIntervalMs / state.simSpeed;
      timeoutIdRef.current = setTimeout(async () => {
        await runTick();
        scheduleNext();
      }, currentInterval);
    }

    if (!isPaused) {
      scheduleNext();
    }

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [baseIntervalMs, isPaused, simSpeed]);

  useEffect(() => {
    if (stepTrigger > 0 && stepTrigger !== lastStepTriggerRef.current) {
      lastStepTriggerRef.current = stepTrigger;
      runTick();
    }
  }, [stepTrigger]);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);
}