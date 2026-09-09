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

    // Detect if survivor is near a built raft
    const activeRaft = state.structures.find((s) => {
      if (s.type !== 'raft') return false;
      const dx = s.position[0] - state.survivorPosition[0];
      const dz = s.position[2] - state.survivorPosition[2];
      return Math.hypot(dx, dz) <= 2.2;
    });

    const isSwimming = state.survivorState === 'SWIM' && !activeRaft;
    const isSailing = activeRaft !== undefined && state.survivorPosition[1] <= -0.15;

    // Transition weather periodically
    if (tickCountRef.current % 8 === 0) {
      const weathers: Array<'Clear' | 'Rain' | 'Storm' | 'Fog'> = ['Clear', 'Clear', 'Rain', 'Storm', 'Fog'];
      const nextWeather = weathers[Math.floor(Math.random() * weathers.length)];
      state.setWeather(nextWeather);
      audioManager?.updateWeatherAudio(nextWeather);
    }

    // Weather impact calculations
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

    // Water traversal penalties
    const waterTempDelta = isSwimming ? -2.2 : 0;
    const waterEnergyDelta = isSwimming ? -14 : (isSailing ? -2 : 0);
    const netTempDelta = isSailing ? Math.max(0, weatherTempDelta) : weatherTempDelta + waterTempDelta;
    const tempRecovery = state.vitals.temperatureC < 36.5 ? 1.5 : 0;

    // Unified structures update
    const isRaining = state.weather === 'Rain' || state.weather === 'Storm';
    const updatedStructures = state.structures.map((struct) => {
      if (struct.type === 'crop_plot') {
        let currentWater = struct.waterLevel ?? 40;
        if (isRaining) currentWater = Math.min(100, currentWater + 30);
        else currentWater = Math.max(0, currentWater - 6);

        let currentStage = struct.cropStage ?? 1;
        if (currentWater > 15 && currentStage < 3 && tickCountRef.current % 4 === 0) {
          currentStage += 1;
        }
        return { ...struct, waterLevel: currentWater, cropStage: currentStage };
      }

      if (struct.type === 'water_collector') {
        let level = struct.waterLevel ?? 0;
        if (isRaining) level = Math.min(100, level + 35);
        else level = Math.max(0, level - 2);
        return { ...struct, waterLevel: level };
      }

      return struct;
    });

    useGameStore.setState({ structures: updatedStructures });

    const payload = {
      day: state.day,
      time_of_day: state.timeOfDay,
      weather: state.weather,
      survivor: {
        position: state.survivorPosition,
        vitals: state.vitals,
        inventory: state.inventory,
        equipped_tool: state.equippedTool,
        is_swimming: isSwimming,
        is_sailing: isSailing
      },
      structures: updatedStructures.map((s) => ({
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
      }))
    };

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

      // 1. Journal Chronicle
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

      // 2. State Kinematics
      if (isSailing) {
        state.setSurvivorState('SAIL');
      } else if (!isSwimming) {
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
        state.applyActionOutcome(
          action.thought_monologue,
          success
            ? 'Constructed a pontoon crossing and reclaimed a new islet!'
            : 'Attempted terraforming but lacked required timber and rock.',
          {
            hunger: success ? -6 : -1,
            energy: (success ? -15 : -2) + waterEnergyDelta,
            hydration: (success ? -10 : -2) + weatherHydrationDelta,
            temperatureC: netTempDelta
          }
        );
        if (success) audioManager?.playTerraformSound();
        return;
      }

      // 4. Drinking
      if (action.action_type === 'DRINK') {
        const cistern = state.structures.find(
          (s) => s.type === 'water_collector' && (s.waterLevel ?? 0) >= 20
        );

        if (cistern) {
          state.setTargetPosition(cistern.position);
          useGameStore.setState((s) => ({
            structures: s.structures.map((st) =>
              st.id === cistern.id ? { ...st, waterLevel: Math.max(0, (st.waterLevel ?? 20) - 25) } : st
            )
          }));
        }

        state.applyActionOutcome(
          action.thought_monologue,
          cistern ? 'Drank clean water gathered in the rain cistern.' : 'Drank cool freshwater to replenish hydration.',
          {
            hunger: -1,
            energy: 5 + waterEnergyDelta,
            hydration: cistern ? 55 : 45 + weatherHydrationDelta,
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
                energy: -8 + waterEnergyDelta,
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
            energy: -2 + waterEnergyDelta,
            hydration: -2 + weatherHydrationDelta,
            temperatureC: netTempDelta,
            health: 0
          }
        );
        return;
      }

      // 6. Harvesting
      if (action.action_type === 'FORAGE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
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
          let multiplier = 1;
          let energyCost = -5;

          if (targetNode.type === 'palm' && state.equippedTool === 'flint_hatchet') {
            multiplier = 2.5;
            energyCost = -3;
          } else if (targetNode.type === 'limestone' && state.equippedTool === 'stone_pickaxe') {
            multiplier = 2.0;
            energyCost = -3;
          } else if (targetNode.type === 'obsidian' && state.equippedTool === 'stone_pickaxe') {
            multiplier = 1.5;
            energyCost = -6;
          } else if (state.equippedTool === null) {
            multiplier = 0.5;
            energyCost = -8;
          }

          const finalAmount = Math.max(1, Math.round(baseDrop.amount * multiplier));
          const currentCount = state.inventory[baseDrop.item] ?? 0;

          state.applyActionOutcome(
            action.thought_monologue,
            `${action.log_message} (+${finalAmount} ${baseDrop.item})`,
            {
              hunger: -3,
              energy: energyCost + waterEnergyDelta,
              hydration: -5 + weatherHydrationDelta,
              temperatureC: netTempDelta,
              health: 0
            },
            { [baseDrop.item]: currentCount + finalAmount }
          );
          return;
        }
      }

      // 7. Hunting
      if (action.action_type === 'HUNT') {
        const targetFauna = state.wildlife.find((w) => w.id === action.target_id) ?? state.wildlife[0];
        if (targetFauna) {
          state.setTargetPosition(targetFauna.position);
          const hasSpear = state.equippedTool === 'fishing_spear';
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
              energy: (hasSpear ? -6 : -14) + waterEnergyDelta,
              hydration: -4,
              health: 0
            },
            { [dropItem]: currentCount + amount }
          );
          return;
        }
      }

      // 8. Locomotion
      if (action.action_type === 'MOVE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) state.setTargetPosition(targetNode.position);

        state.applyActionOutcome(
          action.thought_monologue,
          isSailing ? 'Sailing across open waters on the raft.' : (isSwimming ? 'Swimming through cold currents.' : action.log_message),
          {
            hunger: -2,
            energy: -3 + waterEnergyDelta,
            hydration: -4 + weatherHydrationDelta,
            temperatureC: netTempDelta,
            health: state.vitals.temperatureC < 33 ? -4 : 0
          }
        );
        return;
      }

      // 9. Resting Fallback
      state.applyActionOutcome(
        action.thought_monologue,
        isSailing ? 'Drifting safely upon the raft.' : (isSwimming ? 'Treading cold water trying to keep afloat.' : action.log_message),
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

    if (!isPaused) scheduleNext();

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