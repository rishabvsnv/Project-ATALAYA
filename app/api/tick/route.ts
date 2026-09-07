import { NextResponse } from 'next/server';
import { z } from 'zod';

const ActionSchema = z.object({
  thought_monologue: z.string().default('Surveying surroundings to plan next action.'),
  action_type: z.enum(['MOVE', 'FORAGE', 'CRAFT', 'BUILD', 'REST']).default('FORAGE'),
  target_id: z.string().nullable().default('tree_01'),
  recipe: z.string().nullable().default(null),
  log_message: z.string().default('Survivor begins exploring the island.')
});

export async function POST(req: Request) {
  try {
    const worldContext = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is not defined in process.env! Check your .env.local file.');
      throw new Error('Missing GEMINI_API_KEY');
    }

    const prompt = `You are the autonomous AI survival brain of a stranded survivor on a low-poly island.
Current World Context:
${JSON.stringify(worldContext, null, 2)}

Available node IDs to target: "tree_01", "rock_01", "camp_site".
Available crafting recipes: "campfire", "lean_to", "crafting_bench", "roasted_coconut".

Choose the single best survival action right now.
Respond ONLY with a valid JSON object matching this schema:
{
  "thought_monologue": "first-person thought rationale",
  "action_type": "MOVE" | "FORAGE" | "CRAFT" | "BUILD" | "REST",
  "target_id": "tree_01" | "rock_01" | "camp_site" | null,
  "recipe": "campfire" | "lean_to" | "crafting_bench" | "roasted_coconut" | null,
  "log_message": "third-person action summary"
}`;

    // Target the latest production Flash endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
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

    if (!rawText) {
      console.error('Empty parts response from Gemini:', data);
      throw new Error('No candidate content');
    }

    // Clean any accidental markdown wrap
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsedJson = JSON.parse(rawText);
    const action = ActionSchema.parse(parsedJson);

    console.log('Gemini Live Decision:', action.action_type, '->', action.thought_monologue);
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