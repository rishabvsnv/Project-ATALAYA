import { NextResponse } from 'next/server';
import { z } from 'zod';

const ActionSchema = z.object({
  thought_monologue: z.string().default('Surveying surroundings to plan next action.'),
  action_type: z.enum(['MOVE', 'FORAGE', 'CRAFT', 'BUILD', 'REST', 'DRINK', 'EXPAND_TERRAIN']).default('FORAGE'),
  target_id: z.string().nullable().default(null),
  recipe: z.string().nullable().default(null),
  log_message: z.string().default('Survivor takes action.')
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

SURVIVAL STRATEGY:
- If hydration < 35: Prioritize action_type "DRINK" (target_id can be null or a fresh_well).
- If energy < 25: Prioritize action_type "REST".
- If inventory has driftwood >= 6 and limestone >= 4: You can trigger "EXPAND_TERRAIN" to dredge and discover a new islet with new resources.
- If ingredients are sufficient, craft structures ("campfire", "lean_to", "crafting_bench", "water_collector").
- Otherwise: "FORAGE" accessible nodes or "MOVE" across plates.

Respond ONLY with a valid JSON object matching this schema:
{
  "thought_monologue": "first-person thought rationale",
  "action_type": "MOVE" | "FORAGE" | "CRAFT" | "BUILD" | "REST" | "DRINK" | "EXPAND_TERRAIN",
  "target_id": "string matching an island_node id or null",
  "recipe": "campfire" | "lean_to" | "crafting_bench" | "water_collector" | "roasted_coconut" | null,
  "log_message": "third-person action summary"
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
            temperature: 0.3
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

    console.log('Gemini Intent:', action.action_type, '->', action.thought_monologue);
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
        log_message: 'The survivor rests to regain composure.'
      }
    });
  }
}