import { EquippedToolType, StructureType } from "./store";

export interface Recipe {
  id: string;
  name: string;
  category: 'tool' | 'structure' | 'consumable';
  inputs: Record<string, number>;
  vitalImpact?: { health?: number; hunger?: number; energy?: number };
  structureMeshType?: StructureType;
  grantsTool?: EquippedToolType;
}

export const RECIPE_REGISTRY: Record<string, Recipe> = {
  campfire: {
    id: 'campfire',
    name: 'Campfire',
    category: 'structure',
    inputs: { driftwood: 3, flint: 1 },
    structureMeshType: 'campfire'
  },
  lean_to: {
    id: 'lean_to',
    name: 'Lean-To Shelter',
    category: 'structure',
    inputs: { driftwood: 5, palm_frond: 4 },
    structureMeshType: 'shelter'
  },
  crafting_bench: {
    id: 'crafting_bench',
    name: 'Primitive Workbench',
    category: 'structure',
    inputs: { driftwood: 4, flint: 2 },
    structureMeshType: 'crafting_bench'
  },
  roasted_coconut: {
    id: 'roasted_coconut',
    name: 'Roasted Coconut',
    category: 'consumable',
    inputs: { coconut: 1 },
    vitalImpact: { hunger: 25, energy: 10, health: 5 }
  },
  shelter: {
    id: 'shelter',
    name: 'Thatched A-Frame Shelter',
    category: 'structure',
    structureMeshType: 'shelter',
    inputs: {
      driftwood: 5,
      palm_frond: 4,
      limestone: 2
    },
    vitalImpact: {
      energy: 25,
      health: 10
    }
  },
  crop_plot: {
    id: 'crop_plot',
    name: 'Tilled Soil Crop Bed',
    category: 'structure',
    structureMeshType: 'crop_plot',
    inputs: {
      driftwood: 3,
      palm_frond: 3
    },
    vitalImpact: {
      energy: -10,
      health: 0
    }
  },
  flint_hatchet: {
    id: 'flint_hatchet',
    name: 'Flint Hatchet',
    category: 'tool',
    grantsTool: 'flint_hatchet',
    inputs: { driftwood: 2, flint: 2 },
    vitalImpact: { energy: -8 }
  },
  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: 'Limestone Pickaxe',
    category: 'tool',
    grantsTool: 'stone_pickaxe',
    inputs: { driftwood: 3, limestone: 3 },
    vitalImpact: { energy: -10 }
  },
  fishing_spear: {
    id: 'fishing_spear',
    name: 'Hardened Fishing Spear',
    category: 'tool',
    grantsTool: 'fishing_spear',
    inputs: { driftwood: 3, flint: 1 },
    vitalImpact: { energy: -6 }
  },
  water_collector: {
    id: 'water_collector',
    name: 'Rain Catchment Cistern',
    category: 'structure',
    structureMeshType: 'water_collector',
    inputs: { driftwood: 4, palm_frond: 6, limestone: 2 },
    vitalImpact: { energy: -12 }
  },
  watchtower: {
    id: 'watchtower',
    name: 'High Signal Watchtower',
    category: 'structure',
    structureMeshType: 'watchtower',
    inputs: { driftwood: 8, palm_frond: 4, limestone: 4 },
    vitalImpact: { energy: -20, health: 5 }
  },
  smelting_kiln: {
    id: 'smelting_kiln',
    name: 'Volcanic Obsidian Kiln',
    category: 'structure',
    structureMeshType: 'smelting_kiln',
    inputs: { obsidian: 4, limestone: 6, flint: 2 },
    vitalImpact: { energy: -18 }
  }
};

export interface CraftResult {
  success: boolean;
  reason?: string;
  consumedInventory: Record<string, number>;
  recipe?: Recipe;
}

export function validateAndDeductRecipe(
  recipeId: string,
  currentInventory: Record<string, number>
): CraftResult {
  const recipe = RECIPE_REGISTRY[recipeId];
  if (!recipe) {
    return { success: false, reason: `Unknown recipe "${recipeId}".`, consumedInventory: currentInventory };
  }

  // Check whether survivor holds required inputs
  for (const [item, count] of Object.entries(recipe.inputs)) {
    if ((currentInventory[item] ?? 0) < count) {
      return {
        success: false,
        reason: `Lacks required materials for ${recipe.name}. Needs ${count}x ${item}.`,
        consumedInventory: currentInventory
      };
    }
  }

  // Deduct ingredients
  const updated = { ...currentInventory };
  for (const [item, count] of Object.entries(recipe.inputs)) {
    updated[item] -= count;
    if (updated[item] <= 0) {
      delete updated[item];
    }
  }

  return {
    success: true,
    consumedInventory: updated,
    recipe
  };
}