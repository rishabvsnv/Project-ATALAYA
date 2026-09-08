import { create } from 'zustand';
import { validateAndDeductRecipe, Recipe } from '@/lib/recipes';

export type SimulationSpeed = 1 | 2 | 5;
export type TimePhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';
export type WeatherType = 'Clear' | 'Rain' | 'Storm' | 'Fog';
export type SurvivorAnimState = 'IDLE' | 'WALK' | 'CHOP' | 'SLEEP' | 'BUILD_LAND';

export interface WorldStructure {
  id: string;
  type: 'campfire' | 'shelter' | 'crafting_bench' | 'water_collector' | 'bridge';
  position: [number, number, number];
  rotationY: number;
}

export interface IslandPlate {
  id: string;
  name: string;
  type: 'meadow' | 'volcanic' | 'marsh' | 'sandy_cove';
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface Vitals {
  health: number;
  hunger: number;
  energy: number;
  hydration: number;
  temperatureC: number;
}

export interface IslandNode {
  id: string;
  type: string;
  position: [number, number, number];
  health: number; // Node depleted when 0
}

export interface GameState {
  day: number;
  timeOfDay: TimePhase;
  timeProgress: number;
  weather: WeatherType;

  isPaused: boolean;
  simSpeed: SimulationSpeed;
  stepTrigger: number;
  isProcessing: boolean;

  vitals: Vitals;
  inventory: Record<string, number>;
  equippedTool: string | null;
  survivorPosition: [number, number, number];
  targetPosition: [number, number, number] | null;
  survivorState: SurvivorAnimState;

  plates: IslandPlate[];
  nodes: IslandNode[];
  structures: WorldStructure[];
  latestThought: string;
  logs: string[];

  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setSimSpeed: (speed: SimulationSpeed) => void;
  triggerStep: () => void;
  setProcessing: (status: boolean) => void;
  setTimeProgress: (progress: number, phase: TimePhase) => void;
  setWeather: (weather: WeatherType) => void;
  setTargetPosition: (pos: [number, number, number] | null) => void;
  updateSurvivorPosition: (pos: [number, number, number]) => void;
  setSurvivorState: (status: SurvivorAnimState) => void;
  applyActionOutcome: (
    thought: string,
    log: string,
    deltaVitals: Partial<Vitals>,
    inventoryUpdate?: Record<string, number>
  ) => void;
  executeCraftOrBuild: (recipeKey: string) => boolean;
  expandNewArea: (targetDirection: string) => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  day: 1,
  timeOfDay: 'Day',
  timeProgress: 0.25,
  weather: 'Clear',

  isPaused: false,
  simSpeed: 1,
  stepTrigger: 0,
  isProcessing: false,

  vitals: { health: 100, hunger: 80, energy: 80, hydration: 90, temperatureC: 37 },
  inventory: { driftwood: 8, flint: 4, palm_frond: 6, limestone: 5 },
  equippedTool: null,
  survivorPosition: [0, 0, 0],
  targetPosition: null,
  survivorState: 'IDLE',

  // Starting center island
  plates: [
    {
      id: 'plate_origin',
      name: 'Origin Atoll',
      type: 'meadow',
      position: [0, -0.5, 0],
      radius: 14,
      color: '#4ade80'
    }
  ],

  nodes: [
    { id: 'tree_01', type: 'palm', position: [4, 0.8, -2], health: 100 },
    { id: 'rock_01', type: 'limestone', position: [-4, 0.4, 3], health: 100 },
    { id: 'fresh_well', type: 'water_spring', position: [1, 0.2, -4], health: 100 }
  ],
  structures: [],
  latestThought: 'The island is fertile, but resources are finite. I should survey expansion points.',
  logs: ['Spawned on Origin Atoll.'],

  setPaused: (isPaused) => set({ isPaused }),
  togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  triggerStep: () => set((s) => ({ stepTrigger: s.stepTrigger + 1, isPaused: true })),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setWeather: (weather) => set({ weather }),

  setTargetPosition: (pos) => set({ targetPosition: pos }),
  updateSurvivorPosition: (pos) => set({ survivorPosition: pos }),
  setSurvivorState: (survivorState) => set({ survivorState }),

  setTimeProgress: (progress, phase) =>
    set((state) => {
      const nextDay = progress < state.timeProgress ? state.day + 1 : state.day;
      return { timeProgress: progress, timeOfDay: phase, day: nextDay };
    }),

  applyActionOutcome: (thought, log, deltaVitals, inventoryUpdate) =>
    set((state) => ({
      latestThought: thought,
      logs: [log, ...state.logs.slice(0, 19)],
      vitals: {
        health: Math.max(0, Math.min(100, state.vitals.health + (deltaVitals.health ?? -1))),
        hunger: Math.max(0, Math.min(100, state.vitals.hunger + (deltaVitals.hunger ?? -2))),
        energy: Math.max(0, Math.min(100, state.vitals.energy + (deltaVitals.energy ?? -1))),
        hydration: Math.max(0, Math.min(100, state.vitals.hydration + (deltaVitals.hydration ?? -3))),
        temperatureC: state.vitals.temperatureC + (deltaVitals.temperatureC ?? 0)
      },
      inventory: inventoryUpdate ?? state.inventory
    })),

  // Expand Terrain Mechanics: Synthesizes a new island platelet
  expandNewArea: (targetDirection: string): boolean => {
    const state = get();
    // Requires building supplies to reclaim sea space
    const woodReq = 6;
    const stoneReq = 4;

    if ((state.inventory['driftwood'] ?? 0) < woodReq || (state.inventory['limestone'] ?? 0) < stoneReq) {
      set((s) => ({
        logs: [`[Terraform Failed] Needs ${woodReq}x driftwood & ${stoneReq}x limestone to expand territory.`, ...s.logs.slice(0, 19)]
      }));
      return false;
    }

    // Deduct
    const updatedInv = { ...state.inventory };
    updatedInv['driftwood'] -= woodReq;
    updatedInv['limestone'] -= stoneReq;

    // Angle offset by count of existing plates
    const plateCount = state.plates.length;
    const angle = (plateCount * (Math.PI / 2.3));
    const distance = 18 + Math.random() * 4;
    const newX = Math.cos(angle) * distance;
    const newZ = Math.sin(angle) * distance;

    const biomes: Array<'volcanic' | 'marsh' | 'sandy_cove'> = ['volcanic', 'marsh', 'sandy_cove'];
    const biomeType = biomes[plateCount % biomes.length];
    const biomeColors = { volcanic: '#475569', marsh: '#15803d', sandy_cove: '#fde047' };

    const newPlate: IslandPlate = {
      id: `plate_${Date.now()}`,
      name: `${biomeType.toUpperCase()} ISLET #${plateCount}`,
      type: biomeType,
      position: [newX, -0.6, newZ],
      radius: 9,
      color: biomeColors[biomeType]
    };

    // Spawn 2 new nodes on this newly reclaimed territory
    const newNodeA: IslandNode = {
      id: `node_ore_${Date.now()}`,
      type: biomeType === 'volcanic' ? 'obsidian' : 'palm',
      position: [newX + 2, 0.4, newZ - 1],
      health: 100
    };
    const newNodeB: IslandNode = {
      id: `node_supp_${Date.now()}`,
      type: 'limestone',
      position: [newX - 2, 0.4, newZ + 2],
      health: 100
    };

    set((s) => ({
      inventory: updatedInv,
      plates: [...s.plates, newPlate],
      nodes: [...s.nodes, newNodeA, newNodeB],
      logs: [
        `TERRAFORM COMPLETE: Reclaimed ${newPlate.name} across the channel!`,
        ...s.logs.slice(0, 18)
      ]
    }));

    return true;
  },

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
        position: [sx + Math.cos(angle) * 1.2, sy, sz + Math.sin(angle) * 1.2],
        rotationY: angle
      };

      set((s) => ({
        inventory: consumedInventory,
        structures: [...s.structures, newStructure],
        logs: [`Built ${recipe.name} on the ground.`, ...s.logs.slice(0, 19)]
      }));
      return true;
    }

    set((s) => ({
      inventory: consumedInventory,
      vitals: {
        ...s.vitals,
        health: Math.min(100, s.vitals.health + (recipe.vitalImpact?.health ?? 0)),
        hunger: Math.min(100, s.vitals.hunger + (recipe.vitalImpact?.hunger ?? 0)),
        energy: Math.min(100, s.vitals.energy + (recipe.vitalImpact?.energy ?? 0))
      },
      logs: [`Crafted ${recipe.name}.`, ...s.logs.slice(0, 19)]
    }));
    return true;
  }
}));