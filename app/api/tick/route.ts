import { NextResponse } from 'next/server';
import { z } from 'zod';

const ActionSchema = z.object({
  thought_monologue: z.string().describe("Internal first-person thought rationale."),
  action_type: z.enum(["MOVE", "FORAGE", "CRAFT", "BUILD", "REST"]),
  target_id: z.string().nullable().describe("Target node ID if moving, foraging, or building."),
  recipe: z.string().nullable().describe("Item name if crafting, e.g., 'stone_axe'."),
  log_message: z.string().describe("Third-person event log entry.")
});

export type AgentAction = z.infer<typeof ActionSchema>;

export async function POST(req: Request) {
  try {
    const worldContext = await req.json();

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:3b-instruct",
        stream: false,
        format: {
          type: "object",
          properties: {
            thought_monologue: { type: "string" },
            action_type: { type: "string", enum: ["MOVE", "FORAGE", "CRAFT", "BUILD", "REST"] },
            target_id: { type: ["string", "null"] },
            recipe: { type: ["string", "null"] },
            log_message: { type: "string" }
          },
          required: ["thought_monologue", "action_type", "target_id", "recipe", "log_message"]
        },
        messages: [
          {
            role: "system",
            content: "You are the cognitive survival engine of an isolated low-poly island inhabitant. Prioritize energy management, nourishment, and shelter assembly. Respond strictly using the required schema."
          },
          {
            role: "user",
            content: JSON.stringify(worldContext)
          }
        ],
        options: {
          temperature: 0.3,
          num_predict: 256
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.statusText}`);
    }

    const raw = await response.json();
    const parsedAction = ActionSchema.parse(JSON.parse(raw.message.content));

    return NextResponse.json({ success: true, action: parsedAction });
  } catch (error) {
    console.error("Tick failed:", error);
    // Deterministic fallback prevents the simulation from crashing
    return NextResponse.json({
      success: false,
      fallback: true,
      action: {
        thought_monologue: "My mind feels cloudy. I should conserve energy and rest.",
        action_type: "REST",
        target_id: null,
        recipe: null,
        log_message: "The survivor rests quietly to regain composure."
      }
    });
  }
}