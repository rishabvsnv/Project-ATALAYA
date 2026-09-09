import { create } from "zustand";
import { validateAndDeductRecipe, Recipe } from "@/lib/recipes";
import { persist, createJSONStorage } from "zustand/middleware";

export type SimulationSpeed = 1 | 2 | 5;
export type TimePhase = "Dawn" | "Day" | "Dusk" | "Night";
export type WeatherType = "Clear" | "Rain" | "Storm" | "Fog";
export type SurvivorAnimState =
  | "IDLE"
  | "WALK"
  | "CHOP"
  | "SLEEP"
  | "BUILD_LAND"
  | "SWIM";
export type InterventionTool =
  | "INSPECT"
  | "ORDER_MOVE"
  | "DROP_SUPPLY"
  | "PLANT_NODE"
  | "BUILD_HOUSE"
  | "BUILD_FARM"
  | 'BUILD_BEACON'
  | 'BUILD_KILN';

export type EquippedToolType =
  | "flint_hatchet"
  | "stone_pickaxe"
  | "fishing_spear"
  | null;

export interface JournalEntry {
  id: string;
  day: number;
  timeOfDay: string;
  weather: string;
  title: string;
  entry: string;
  type: "milestone" | "discovery" | "survival" | "thought";
}

export type StructureType =
  | 'campfire'
  | 'shelter'
  | 'crafting_bench'
  | 'water_collector'
  | 'bridge'
  | 'crop_plot'
  | 'watchtower'
  | 'smelting_kiln';

export interface WorldStructure {
  id: string;
  type: StructureType;
  position: [number, number, number];
  rotationY: number;
  cropStage?: number;
  waterLevel?: number;
  isLit?: boolean;
}
export interface IslandPlate {
  id: string;
  name: string;
  type: "meadow" | "volcanic" | "marsh" | "sandy_cove";
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
  health: number;
}

export interface FaunaEntity {
  id: string;
  type: 'crab' | 'fish';
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
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
  equippedTool: EquippedToolType;
  equipTool: (tool: EquippedToolType) => void;
  wildlife: FaunaEntity[];
  setWildlife: (wildlife: FaunaEntity[]) => void;
  harvestWildlife: (id: string) => void;
  survivorPosition: [number, number, number];
  targetPosition: [number, number, number] | null;
  survivorState: SurvivorAnimState;

  plates: IslandPlate[];
  nodes: IslandNode[];
  structures: WorldStructure[];
  latestThought: string;
  logs: string[];

  activeTool: InterventionTool;
  setActiveTool: (tool: InterventionTool) => void;
  spawnSupplyCrate: (pos: [number, number, number]) => void;
  plantCustomNode: (
    pos: [number, number, number],
    type: "palm" | "limestone"
  ) => void;

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

  journal: JournalEntry[];
  isJournalOpen: boolean;
  setJournalOpen: (open: boolean) => void;
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => void;
  resetWorld: () => void;
}

const INITIAL_PLATES: IslandPlate[] = [
  {
    id: "plate_origin",
    name: "Origin Atoll",
    type: "meadow",
    position: [0, 0, 0],
    radius: 14,
    color: "#4ade80",
  },
];

const INITIAL_NODES: IslandNode[] = [
  { id: "tree_01", type: "palm", position: [4, 0, -2], health: 100 },
  { id: "rock_01", type: "limestone", position: [-4, 0, 3], health: 100 },
  {
    id: "fresh_well",
    type: "water_spring",
    position: [1, 0, -4],
    health: 100,
  },
];

const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: "entry_0",
    day: 1,
    timeOfDay: "Day",
    weather: "Clear",
    title: "Awakening on Origin Atoll",
    entry:
      "Washed ashore with salt in my eyes and limestone underfoot. The horizon is empty, but the island has fresh spring water and timber.",
    type: "milestone",
  },
];

const INITIAL_WILDLIFE: FaunaEntity[] = [
  { id: "crab_1", type: "crab", position: [5, 0.05, 3], velocity: [0, 0, 0], health: 1 },
  { id: "crab_2", type: "crab", position: [-4, 0.05, 4], velocity: [0, 0, 0], health: 1 },
  { id: "fish_1", type: "fish", position: [9, -0.45, 2], velocity: [0.5, 0, 0.5], health: 1 },
  { id: "fish_2", type: "fish", position: [-8, -0.45, -5], velocity: [-0.4, 0, 0.3], health: 1 },
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      day: 1,
      timeOfDay: "Day",
      timeProgress: 0.25,
      weather: "Clear",

      isPaused: false,
      simSpeed: 1,
      stepTrigger: 0,
      isProcessing: false,

      vitals: {
        health: 100,
        hunger: 80,
        energy: 80,
        hydration: 90,
        temperatureC: 37,
      },
      inventory: { driftwood: 8, flint: 4, palm_frond: 6, limestone: 5 },
      equippedTool: null,
      equipTool: (equippedTool) => set({ equippedTool }),

      wildlife: INITIAL_WILDLIFE,
      setWildlife: (wildlife) => set({ wildlife }),
      harvestWildlife: (id) =>
        set((s) => ({
          wildlife: s.wildlife.filter((w) => w.id !== id),
        })),

      survivorPosition: [0, 0, 0],
      targetPosition: null,
      survivorState: "IDLE",

      plates: INITIAL_PLATES,
      nodes: INITIAL_NODES,
      structures: [],
      latestThought:
        "The island is fertile, but resources are finite. I should survey expansion points.",
      logs: ["Spawned on Origin Atoll."],

      activeTool: "INSPECT",
      setActiveTool: (activeTool) => set({ activeTool }),

      spawnSupplyCrate: (pos) => {
        const drops = ["driftwood", "flint", "palm_frond", "limestone"];
        const pickedItem = drops[Math.floor(Math.random() * drops.length)];
        const count = Math.floor(Math.random() * 3) + 2;

        set((s) => ({
          inventory: {
            ...s.inventory,
            [pickedItem]: (s.inventory[pickedItem] ?? 0) + count,
          },
          logs: [
            `[God-Mode] Dropped supply crate (+${count} ${pickedItem}) near [${pos[0].toFixed(1)}, ${pos[2].toFixed(1)}]`,
            ...s.logs.slice(0, 18),
          ],
        }));
      },

      plantCustomNode: (pos, type) => {
        const newNode: IslandNode = {
          id: `node_user_${Date.now()}`,
          type,
          position: [pos[0], 0, pos[2]],
          health: 100,
        };

        set((s) => ({
          nodes: [...s.nodes, newNode],
          logs: [
            `[God-Mode] Seeded new ${type} resource node at [${pos[0].toFixed(1)}, ${pos[2].toFixed(1)}]`,
            ...s.logs.slice(0, 18),
          ],
        }));
      },

      journal: INITIAL_JOURNAL,
      isJournalOpen: false,
      setJournalOpen: (isJournalOpen) => set({ isJournalOpen }),
      addJournalEntry: (entry) =>
        set((s) => ({
          journal: [{ id: `journal_${Date.now()}`, ...entry }, ...s.journal],
        })),

      resetWorld: () => {
        useGameStore.persist.clearStorage();

        if (typeof window !== "undefined") {
          localStorage.removeItem("atalaya_island_save");
        }

        set({
          day: 1,
          timeOfDay: "Day",
          timeProgress: 0.25,
          weather: "Clear",
          isPaused: false,
          simSpeed: 1,
          stepTrigger: 0,
          isProcessing: false,
          vitals: {
            health: 100,
            hunger: 80,
            energy: 80,
            hydration: 90,
            temperatureC: 37,
          },
          inventory: { driftwood: 8, flint: 4, palm_frond: 6, limestone: 5 },
          equippedTool: null,
          survivorPosition: [0, 0, 0],
          targetPosition: null,
          survivorState: "IDLE",
          plates: INITIAL_PLATES,
          nodes: INITIAL_NODES,
          structures: [],
          latestThought:
            "The island is fertile, but resources are finite. I should survey expansion points.",
          logs: ["Spawned on Origin Atoll."],
          journal: INITIAL_JOURNAL,
        });

        window.location.href = window.location.pathname;
      },

      setPaused: (isPaused) => set({ isPaused }),
      togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
      setSimSpeed: (simSpeed) => set({ simSpeed }),
      triggerStep: () =>
        set((s) => ({ stepTrigger: s.stepTrigger + 1, isPaused: true })),
      setProcessing: (isProcessing) => set({ isProcessing }),
      setWeather: (weather) => set({ weather }),

      setTargetPosition: (pos) => set({ targetPosition: pos }),
      updateSurvivorPosition: (pos) => set({ survivorPosition: pos }),
      setSurvivorState: (survivorState) => set({ survivorState }),

      setTimeProgress: (progress, phase) =>
        set((state) => {
          const nextDay =
            progress < state.timeProgress ? state.day + 1 : state.day;
          return { timeProgress: progress, timeOfDay: phase, day: nextDay };
        }),

      applyActionOutcome: (thought, log, deltaVitals, inventoryUpdate) =>
        set((state) => ({
          latestThought: thought,
          logs: [log, ...state.logs.slice(0, 19)],
          vitals: {
            health: Math.max(
              0,
              Math.min(100, state.vitals.health + (deltaVitals.health ?? -1))
            ),
            hunger: Math.max(
              0,
              Math.min(100, state.vitals.hunger + (deltaVitals.hunger ?? -2))
            ),
            energy: Math.max(
              0,
              Math.min(100, state.vitals.energy + (deltaVitals.energy ?? -1))
            ),
            hydration: Math.max(
              0,
              Math.min(100, state.vitals.hydration + (deltaVitals.hydration ?? -3))
            ),
            temperatureC: Math.max(
              15,
              Math.min(
                42,
                state.vitals.temperatureC + (deltaVitals.temperatureC ?? 0)
              )
            ),
          },
          inventory: inventoryUpdate ?? state.inventory,
        })),

      expandNewArea: (targetDirection: string): boolean => {
        const state = get();
        const woodReq = 6;
        const stoneReq = 4;

        if (
          (state.inventory["driftwood"] ?? 0) < woodReq ||
          (state.inventory["limestone"] ?? 0) < stoneReq
        ) {
          set((s) => ({
            logs: [
              `[Terraform Failed] Needs ${woodReq}x driftwood & ${stoneReq}x limestone to expand territory.`,
              ...s.logs.slice(0, 19),
            ],
          }));
          return false;
        }

        const updatedInv = { ...state.inventory };
        updatedInv["driftwood"] -= woodReq;
        updatedInv["limestone"] -= stoneReq;

        const plateCount = state.plates.length;
        const angle = plateCount * (Math.PI / 2.3);
        const distance = 18 + Math.random() * 4;
        const newX = Math.cos(angle) * distance;
        const newZ = Math.sin(angle) * distance;

        const biomes: Array<"volcanic" | "marsh" | "sandy_cove"> = [
          "volcanic",
          "marsh",
          "sandy_cove",
        ];
        const biomeType = biomes[plateCount % biomes.length];
        const biomeColors = {
          volcanic: "#475569",
          marsh: "#15803d",
          sandy_cove: "#fde047",
        };

        const newPlate: IslandPlate = {
          id: `plate_${Date.now()}`,
          name: `${biomeType.toUpperCase()} ISLET #${plateCount}`,
          type: biomeType,
          position: [newX, 0, newZ],
          radius: 9,
          color: biomeColors[biomeType],
        };

        const newNodeA: IslandNode = {
          id: `node_ore_${Date.now()}`,
          type: biomeType === "volcanic" ? "obsidian" : "palm",
          position: [newX + 2, 0, newZ - 1],
          health: 100,
        };
        const newNodeB: IslandNode = {
          id: `node_supp_${Date.now()}`,
          type: "limestone",
          position: [newX - 2, 0, newZ + 2],
          health: 100,
        };

        set((s) => ({
          inventory: updatedInv,
          plates: [...s.plates, newPlate],
          nodes: [...s.nodes, newNodeA, newNodeB],
          logs: [
            `TERRAFORM COMPLETE: Reclaimed ${newPlate.name} across the channel!`,
            ...s.logs.slice(0, 18),
          ],
        }));

        return true;
      },

      executeCraftOrBuild: (recipeKey: string): boolean => {
        const state = get();
        const result = validateAndDeductRecipe(recipeKey, state.inventory);

        if (!result.success || !result.recipe) {
          set((s) => ({
            logs: [`[Failed Craft] ${result.reason}`, ...s.logs.slice(0, 19)],
          }));
          return false;
        }

        const { recipe, consumedInventory } = result;

        if (recipe.category === "structure" && recipe.structureMeshType) {
          const [sx, sy, sz] = state.survivorPosition;
          const angle = Math.random() * Math.PI * 2;
          const newStructure: WorldStructure = {
            id: `struct_${Date.now()}`,
            type: recipe.structureMeshType,
            position: [sx + Math.cos(angle) * 1.2, sy, sz + Math.sin(angle) * 1.2],
            rotationY: angle,
          };

          set((s) => ({
            inventory: consumedInventory,
            structures: [...s.structures, newStructure],
            logs: [`Built ${recipe.name} on the ground.`, ...s.logs.slice(0, 19)],
          }));
          return true;
        }

        if (recipe.category === "tool" && recipe.grantsTool) {
          set((s) => ({
            inventory: consumedInventory,
            equippedTool: recipe.grantsTool,
            logs: [`Crafted and equipped ${recipe.name}!`, ...s.logs.slice(0, 19)],
          }));
          return true;
        }

        set((s) => ({
          inventory: consumedInventory,
          vitals: {
            ...s.vitals,
            health: Math.min(
              100,
              s.vitals.health + (recipe.vitalImpact?.health ?? 0)
            ),
            hunger: Math.min(
              100,
              s.vitals.hunger + (recipe.vitalImpact?.hunger ?? 0)
            ),
            energy: Math.min(
              100,
              s.vitals.energy + (recipe.vitalImpact?.energy ?? 0)
            ),
          },
          logs: [`Crafted ${recipe.name}.`, ...s.logs.slice(0, 19)],
        }));
        return true;
      },
    }),
    {
      name: "atalaya_island_save",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        day: state.day,
        timeOfDay: state.timeOfDay,
        timeProgress: state.timeProgress,
        vitals: state.vitals,
        inventory: state.inventory,
        equippedTool: state.equippedTool, // Preserves equipped tool across page reloads
        survivorPosition: state.survivorPosition,
        plates: state.plates,
        nodes: state.nodes,
        structures: state.structures,
        journal: state.journal,
        logs: state.logs,
      }),
    }
  )
);