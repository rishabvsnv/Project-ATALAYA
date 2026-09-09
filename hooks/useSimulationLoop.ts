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

    // Swimming metrics & penalties
    const isSwimming = state.survivorState === 'SWIM';
    const swimTempDelta = isSwimming ? -2.2 : 0;
    const swimEnergyDelta = isSwimming ? -14 : 0;

    // Transition weather periodically
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
        inventory: state.inventory,
        equipped_tool: state.equippedTool,
        is_swimming: isSwimming
      },
      structures: state.structures.map((s) => ({
        id: s.id,
        type: s.type,
        cropStage: s.cropStage,
        waterLevel: s.waterLevel
      })),
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
      })),
      wildlife_nearby: state.wildlife.map((w) => ({
        id: w.id,
        type: w.type,
        position: w.position
      })),
    };

    // Environmental impacts
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

    const netTempDelta = weatherTempDelta + swimTempDelta;
    const tempRecovery = state.vitals.temperatureC < 36.5 ? 1.5 : 0;

    // Advance farming crops on every tick
    const isRaining = state.weather === 'Rain' || state.weather === 'Storm';

    const updatedStructures = state.structures.map((s) => {
      if (s.type !== 'crop_plot') return s;

      let currentWater = s.waterLevel ?? 40;
      if (isRaining) currentWater = Math.min(100, currentWater + 30);
      else currentWater = Math.max(0, currentWater - 6);

      let currentStage = s.cropStage ?? 1; // Auto-seed on build
      // Crops only grow if watered
      if (currentWater > 15 && currentStage < 3 && tickCountRef.current % 4 === 0) {
        currentStage += 1;
      }

      return { ...s, waterLevel: currentWater, cropStage: currentStage };
    });

    useGameStore.setState({ structures: updatedStructures });

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

      // 1. Capture journal log
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

      // 2. Kinesthetic posture (preserve SWIM if in water)
      if (!isSwimming) {
        if (action.action_type === 'REST') {
          state.setSurvivorState('SLEEP');
        } else if (['FORAGE', 'BUILD', 'CRAFT', 'EXPAND_TERRAIN'].includes(action.action_type)) {
          state.setSurvivorState('CHOP');
        } else if (action.action_type === 'MOVE') {
          state.setSurvivorState('WALK');
        } else {
          state.setSurvivorState('IDLE');
        }
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
              energy: -15 + swimEnergyDelta,
              hydration: -10 + weatherHydrationDelta,
              temperatureC: netTempDelta
            }
          );
        } else {
          state.applyActionOutcome(
            action.thought_monologue,
            'Attempted terraforming but lacked required timber and rock.',
            {
              hunger: -1,
              energy: -2 + swimEnergyDelta,
              hydration: -2 + weatherHydrationDelta,
              temperatureC: netTempDelta
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
            energy: 4 + swimEnergyDelta,
            hydration: 45 + weatherHydrationDelta,
            temperatureC: netTempDelta
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
                energy: -8 + swimEnergyDelta,
                hydration: -6 + weatherHydrationDelta,
                temperatureC: netTempDelta,
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
            energy: -2 + swimEnergyDelta,
            hydration: -2 + weatherHydrationDelta,
            temperatureC: netTempDelta,
            health: 0
          }
        );
        return;
      }

      // 6. Harvesting with Tool Multipliers
      if (action.action_type === 'FORAGE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
          // Hardness gating: Obsidian requires Stone Pickaxe
          if (targetNode.type === 'obsidian' && state.equippedTool !== 'stone_pickaxe') {
            state.applyActionOutcome(
              action.thought_monologue,
              'Cannot mine volcanic obsidian with bare hands or hatchet! Requires a Stone Pickaxe.',
              { energy: -2, hunger: -1 }
            );
            return;
          }

          state.setTargetPosition(targetNode.position);
          audioManager?.playChopSound();

          const baseDrop = NODE_HARVEST_TABLE[targetNode.type] ?? { item: 'driftwood', amount: 1 };

          // Tool Tier Yield Multipliers
          let multiplier = 1;
          let energyCost = -5;

          if (targetNode.type === 'palm' && state.equippedTool === 'flint_hatchet') {
            multiplier = 2.5; // Yields 5 wood
            energyCost = -3;
          } else if (targetNode.type === 'limestone' && state.equippedTool === 'stone_pickaxe') {
            multiplier = 2.0; // Yields 4 limestone
            energyCost = -3;
          } else if (targetNode.type === 'obsidian' && state.equippedTool === 'stone_pickaxe') {
            multiplier = 1.5; // Yields 3 flint/ore
            energyCost = -6;
          } else if (state.equippedTool === null) {
            multiplier = 0.5; // Bare-hands penalty: 1 drop
            energyCost = -8;
          }

          const finalAmount = Math.max(1, Math.round(baseDrop.amount * multiplier));
          const currentCount = state.inventory[baseDrop.item] ?? 0;

          state.applyActionOutcome(
            action.thought_monologue,
            `${action.log_message} (+${finalAmount} ${baseDrop.item})`,
            {
              hunger: -3,
              energy: energyCost + swimEnergyDelta,
              hydration: -5 + weatherHydrationDelta,
              temperatureC: netTempDelta,
              health: 0
            },
            { [baseDrop.item]: currentCount + finalAmount }
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
          isSwimming ? 'Swimming through open water currents.' : action.log_message,
          {
            hunger: -2,
            energy: -3 + swimEnergyDelta,
            hydration: -4 + weatherHydrationDelta,
            temperatureC: netTempDelta,
            health: state.vitals.temperatureC < 33 ? -4 : 0
          }
        );
        return;
      }

      // 8. Hunting & Fishing Execution
      if (action.action_type === 'HUNT') {
        const targetFauna = state.wildlife.find((w) => w.id === action.target_id) ?? state.wildlife[0];

        if (targetFauna) {
          state.setTargetPosition(targetFauna.position);
          const hasSpear = state.equippedTool === 'fishing_spear';

          // Spear grants guaranteed high catch, bare hands can fail or yield less
          const dropItem = targetFauna.type === 'crab' ? 'crab_meat' : 'raw_fish';
          const amount = hasSpear ? 2 : 1;
          const currentCount = state.inventory[dropItem] ?? 0;

          state.harvestWildlife(targetFauna.id);

          state.applyActionOutcome(
            action.thought_monologue,
            hasSpear
              ? `Speared a ${targetFauna.type} cleanly! (+${amount} ${dropItem})`
              : `Caught a ${targetFauna.type} by hand with great effort. (+${amount} ${dropItem})`,
            {
              hunger: 15,
              energy: hasSpear ? -6 : -14,
              hydration: -4,
              health: 0
            },
            { [dropItem]: currentCount + amount }
          );
          return;
        }
      }

      // 8. Resting Fallback
      state.applyActionOutcome(
        action.thought_monologue,
        isSwimming ? 'Treading cold water trying to keep afloat.' : action.log_message,
        {
          hunger: -1,
          energy: isSwimming ? -8 : 16,
          hydration: -2 + weatherHydrationDelta,
          temperatureC: netTempDelta + tempRecovery,
          health: isSwimming && state.vitals.temperatureC < 33 ? -6 : 2
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