import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';

const NODE_HARVEST_TABLE: Record<string, { item: string; amount: number }> = {
  palm: { item: 'driftwood', amount: 2 },
  limestone: { item: 'flint', amount: 1 },
  clearing: { item: 'palm_frond', amount: 2 }
};

export function useSimulationLoop(baseIntervalMs = 5000) {
  const isRunningRef = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastStepTriggerRef = useRef(0);

  const stepTrigger = useGameStore((s) => s.stepTrigger);
  const isPaused = useGameStore((s) => s.isPaused);
  const simSpeed = useGameStore((s) => s.simSpeed);

  const runTick = async () => {
    const state = useGameStore.getState();
    if (state.isProcessing) return;

    state.setProcessing(true);

    const payload = {
      day: state.day,
      time_of_day: state.timeOfDay,
      survivor: {
        position: state.survivorPosition,
        vitals: state.vitals,
        inventory: state.inventory
      },
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

      // Update procedural animation state based on LLM intent
      if (action.action_type === 'REST') {
        state.setSurvivorState('SLEEP');
      } else if (['FORAGE', 'BUILD', 'CRAFT'].includes(action.action_type)) {
        state.setSurvivorState('CHOP');
      } else if (action.action_type === 'MOVE') {
        state.setSurvivorState('WALK');
      } else {
        state.setSurvivorState('IDLE');
      }

      if (action.action_type === 'CRAFT' || action.action_type === 'BUILD') {
        if (action.recipe) {
          const success = state.executeCraftOrBuild(action.recipe);
          if (success) {
            state.applyActionOutcome(
              action.thought_monologue,
              action.log_message,
              { hunger: -4, energy: -8, health: 0 }
            );
            return;
          }
        }
        state.applyActionOutcome(
          action.thought_monologue,
          `Attempted to craft ${action.recipe ?? 'item'}, but lacked ingredients.`,
          { hunger: -1, energy: -2, health: 0 }
        );
        return;
      }

      if (action.action_type === 'FORAGE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
          state.setTargetPosition(targetNode.position);
          const drop = NODE_HARVEST_TABLE[targetNode.type] ?? { item: 'driftwood', amount: 1 };
          const currentCount = state.inventory[drop.item] ?? 0;
          state.applyActionOutcome(
            action.thought_monologue,
            action.log_message,
            { hunger: -3, energy: -5, health: 0 },
            { [drop.item]: currentCount + drop.amount }
          );
          return;
        }
      }

      if (action.action_type === 'MOVE') {
        const targetNode = state.nodes.find((n) => n.id === action.target_id);
        if (targetNode) {
          state.setTargetPosition(targetNode.position);
        }
        state.applyActionOutcome(
          action.thought_monologue,
          action.log_message,
          { hunger: -2, energy: -3, health: 0 }
        );
        return;
      }

      state.applyActionOutcome(
        action.thought_monologue,
        action.log_message,
        { hunger: -1, energy: +16, health: +2 }
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