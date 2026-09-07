import { create } from 'zustand';
import { validateAndDeductRecipe, Recipe } from '@/lib/recipes';

export type SimulationSpeed = 1 | 2 | 5;
export type TimePhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

export interface WorldStructure {
  id: string;
  type: 'campfire' | 'shelter' | 'crafting_bench' | 'water_collector';
  position: [number, number, number];
  rotationY: number;
}

export interface Vitals {
  health: number;
  hunger: number;
  energy: number;
}

export interface IslandNode {
  id: string;
  type: string;
  position: [number, number, number];
}

export interface GameState {
  // World & Time
  day: number;
  timeOfDay: TimePhase;
  timeProgress: number; // 0.0 to 1.0 continuous normalized day cycle

  // Simulation Controls
  isPaused: boolean;
  simSpeed: SimulationSpeed;
  stepTrigger: number;
  isProcessing: boolean;

  // Survivor Data
  vitals: Vitals;
  inventory: Record<string, number>;
  survivorPosition: [number, number, number];
  targetPosition: [number, number, number] | null;

  // Environment & Feed
  nodes: IslandNode[];
  structures: WorldStructure[];
  latestThought: string;
  logs: string[];

  // Actions
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setSimSpeed: (speed: SimulationSpeed) => void;
  triggerStep: () => void;
  setProcessing: (status: boolean) => void;
  setTimeProgress: (progress: number, phase: TimePhase) => void;
  setTargetPosition: (pos: [number, number, number] | null) => void;
  updateSurvivorPosition: (pos: [number, number, number]) => void;
  applyActionOutcome: (
    thought: string,
    log: string,
    deltaVitals: Partial<Vitals>,
    inventoryUpdate?: Record<string, number>
  ) => void;
  executeCraftOrBuild: (recipeKey: string) => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  // World Defaults
  day: 1,
  timeOfDay: 'Day',
  timeProgress: 0.25,

  // Control Defaults
  isPaused: false,
  simSpeed: 1,
  stepTrigger: 0,
  isProcessing: false,

  // Survivor Defaults
  vitals: { health: 100, hunger: 75, energy: 80 },
  inventory: { driftwood: 6, flint: 2, palm_frond: 5 },
  survivorPosition: [0, 0, 0],
  targetPosition: null,

  // Map & Logs Defaults
  nodes: [
    { id: 'tree_01', type: 'palm', position: [4, 0, -2] },
    { id: 'rock_01', type: 'limestone', position: [-3, 0, 3] },
    { id: 'camp_site', type: 'clearing', position: [0, 0, 1] }
  ],
  structures: [],
  latestThought: 'Surveying the shoreline for raw supplies.',
  logs: ['Spawned on the island.'],

  // Control Setters
  setPaused: (isPaused) => set({ isPaused }),
  togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  triggerStep: () => set((s) => ({ stepTrigger: s.stepTrigger + 1, isPaused: true })),
  setProcessing: (isProcessing) => set({ isProcessing }),

  // Navigation & Time Setters
  setTargetPosition: (pos) => set({ targetPosition: pos }),
  updateSurvivorPosition: (pos) => set({ survivorPosition: pos }),
  setTimeProgress: (progress, phase) =>
    set((state) => {
      const nextDay = progress < state.timeProgress ? state.day + 1 : state.day;
      return { timeProgress: progress, timeOfDay: phase, day: nextDay };
    }),

  // State Mutation Resolvers
  applyActionOutcome: (thought, log, deltaVitals, inventoryUpdate) =>
    set((state) => ({
      latestThought: thought,
      logs: [log, ...state.logs.slice(0, 19)],
      vitals: {
        health: Math.max(0, Math.min(100, state.vitals.health + (deltaVitals.health ?? -1))),
        hunger: Math.max(0, Math.min(100, state.vitals.hunger + (deltaVitals.hunger ?? -2))),
        energy: Math.max(0, Math.min(100, state.vitals.energy + (deltaVitals.energy ?? -1)))
      },
      inventory: inventoryUpdate ?? state.inventory
    })),

  executeCraftOrBuild: (recipeKey: string): boolean => {
    const state = get();
    const result = validateAndDeductRecipe(recipeKey, state.inventory);

    if (!result.success || !result.recipe) {
      set((s) => ({
        logs: [`[Failed Craft] ${result.reason}`, ...s.logs.slice(0, 19)]
      }));
      return false;
    }

    const { recipe, consumedInventory } = result;

    if (recipe.category === 'structure' && recipe.structureMeshType) {
      const [sx, sy, sz] = state.survivorPosition;
      const angle = Math.random() * Math.PI * 2;
      const newStructure: WorldStructure = {
        id: `struct_${Date.now()}`,
        type: recipe.structureMeshType,
        position: [sx + Math.cos(angle) * 0.8, sy, sz + Math.sin(angle) * 0.8],
        rotationY: angle
      };

      set((s) => ({
        inventory: consumedInventory,
        structures: [...s.structures, newStructure],
        logs: [`Assembled ${recipe.name}`, ...s.logs.slice(0, 19)]
      }));
      return true;
    }

    set((s) => ({
      inventory: consumedInventory,
      vitals: {
        health: Math.min(100, s.vitals.health + (recipe.vitalImpact?.health ?? 0)),
        hunger: Math.min(100, s.vitals.hunger + (recipe.vitalImpact?.hunger ?? 0)),
        energy: Math.min(100, s.vitals.energy + (recipe.vitalImpact?.energy ?? 0))
      },
      logs: [`Crafted and applied ${recipe.name}.`, ...s.logs.slice(0, 19)]
    }));
    return true;
  }
}));