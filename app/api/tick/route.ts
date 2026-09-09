import { NextResponse } from 'next/server';
import { z } from 'zod';

const ActionSchema = z.object({
  thought_monologue: z.string().default('Surveying surroundings to plan next action.'),
  action_type: z.enum([
    'MOVE',
    'FORAGE',
    'CRAFT',
    'BUILD',
    'REST',
    'DRINK',
    'EXPAND_TERRAIN',
    'FARM_HARVEST',
    'HUNT'
  ]).default('FORAGE'),
  target_id: z.string().nullable().default(null),
  recipe: z.enum([
    'campfire',
    'shelter',
    'crop_plot',
    'crafting_bench',
    'roasted_coconut',
    'flint_hatchet',
    'stone_pickaxe',
    'fishing_spear',
    'water_collector',
    'watchtower',
    'smelting_kiln'
  ]).nullable().default(null),
  log_message: z.string().default('Survivor takes action.'),
  journal_log: z.object({
    title: z.string(),
    narrative: z.string(),
    type: z.enum(['milestone', 'discovery', 'survival', 'thought'])
  }).nullable().default(null)
});

export async function POST(req: Request) {
  try {
    const worldContext = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is not defined in process.env!');
      throw new Error('Missing GEMINI_API_KEY');
    }

    const prompt = `You are the autonomous AI survival brain of a stranded survivor on a dynamic low-poly archipelago.
Current World Context:
${JSON.stringify(worldContext, null, 2)}

SURVIVAL STRATEGY & EVOLUTION:
1. IMMEDIATE THREATS:
   - If hydration < 35: Prioritize action_type "DRINK".
   - If energy < 25: Prioritize action_type "REST" (resting near or in a shelter yields maximum recovery).
   - If weather is "Rain" or "Storm" and no "shelter" exists nearby, prioritize building one immediately.

2. TOOL HIERARCHY & PROGRESSION:
   - If equipped_tool is null and inventory has driftwood >= 2, flint >= 2: Prioritize CRAFTing "flint_hatchet" to gain 2.5x palm yields and cut energy depletion!
   - If obsidian ore is discovered and equipped_tool is not "stone_pickaxe" and inventory has driftwood >= 3, limestone >= 3: CRAFT "stone_pickaxe".
   - If equipped_tool is null, foraging nodes is penalized with 50% yields and high exhaustion.

3. AGRICULTURE & LONG-TERM SUSTENANCE:
   - If any "crop_plot" structure in the world has cropStage >= 3, your highest priority is "FARM_HARVEST" (target_id null or plot id) to establish food security.
   - If no "crop_plot" exists and inventory has driftwood >= 3 and palm_frond >= 3: Choose action_type "BUILD" with recipe "crop_plot".

4. ARCHITECTURE & EXPANSION:
   - If no "shelter" exists and inventory has driftwood >= 5, palm_frond >= 4, limestone >= 2: Choose action_type "BUILD" with recipe "shelter".
   - If night/dusk falls and cold threatens, BUILD "campfire" (needs driftwood >= 3, flint >= 1).
   - If inventory has driftwood >= 6 and limestone >= 4 and basic survival needs are met: Trigger "EXPAND_TERRAIN" to uncover a new islet.

5. RESOURCE GATHERING:
   - Otherwise, choose "FORAGE" on an accessible resource node (set "target_id" to matching node id) or "MOVE" to an unharvested zone.

6. CHRONICLING:
   - Provide a poetic first-person past-tense "journal_log" when achieving milestones (forging a new tool, planting crops, harvesting food, building a shelter, terraforming). Otherwise keep null.

7. HUNTING & FISHING:
  - If hunger < 50 and wildlife_nearby contains entities:
    - Target crab on shorelines or fish in shallows using action_type "HUNT" with "target_id".
    - If fishing_spear is equipped, hunting succeeds efficiently.

TECHNOLOGY & MONUMENT PROGRESSION:
1. INFRASTRUCTURE:
   - "water_collector" (4 driftwood, 6 palm_frond, 2 limestone): Catches rainwater automatically. Highly recommended so you never die of dehydration away from the well.
   
2. SETTLEMENT MONUMENTS:
   - "watchtower" (8 driftwood, 4 palm_frond, 4 limestone): High signal station with an eternal beacon. Prioritize this once basic shelter and crops exist.
   - "smelting_kiln" (4 obsidian, 6 limestone, 2 flint): Advanced high-temperature furnace built with mined obsidian. Represents peak engineering.

Prioritize building these enduring monuments when your survival needs (hunger > 50, hydration > 50, energy > 40) are secure and ingredients are collected.

Respond ONLY with a valid JSON object matching this schema:
{
  "thought_monologue": "first-person internal monologue reflecting needs and strategy",
  "action_type": "MOVE" | "FORAGE" | "CRAFT" | "BUILD" | "REST" | "DRINK" | "EXPAND_TERRAIN" | "FARM_HARVEST",
  "target_id": "string matching an island_node id or null",
  "recipe": "flint_hatchet" | "stone_pickaxe" | "fishing_spear" | "campfire" | "shelter" | "crop_plot" | "crafting_bench" | "roasted_coconut" | null,
  "log_message": "concise third-person narrative action summary",
  "journal_log": {
    "title": "short milestone title",
    "narrative": "first-person past tense chronicle reflection",
    "type": "milestone" | "discovery" | "survival" | "thought"
  } | null
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error [${response.status}]:`, errText);
      throw new Error(`Gemini Error ${response.status}`);
    }

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('No candidate content');

    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const action = ActionSchema.parse(JSON.parse(rawText));

    console.log('Gemini Action:', action.action_type, '->', action.recipe ?? action.thought_monologue);
    return NextResponse.json({ success: true, action });

  } catch (error: any) {
    console.error('Tick caught error:', error?.message ?? error);
    return NextResponse.json({
      success: false,
      fallback: true,
      action: {
        thought_monologue: 'My mind feels hazy... I will rest until strength returns.',
        action_type: 'REST',
        target_id: null,
        recipe: null,
        log_message: 'The survivor rests to regain composure.',
        journal_log: null
      }
    });
  }
}