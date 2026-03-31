import { generateText, Output } from "ai";
import { z } from "zod";

const LightCommandSchema = z.object({
  action: z.enum(["turn_on", "turn_off", "set_color", "set_brightness", "set_temperature"]),
  target: z
    .enum(["all", "floor lamp", "led bulb"])
    .describe("Which device(s) to control. Use 'all' when the user says 'lights' generically."),
  color: z
    .object({
      r: z.number().min(0).max(255),
      g: z.number().min(0).max(255),
      b: z.number().min(0).max(255),
    })
    .optional()
    .describe("RGB color. Only set when action is set_color."),
  brightness: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Brightness 0-100. Only set when action is set_brightness."),
  colorTemperature: z
    .number()
    .optional()
    .describe("Color temperature in Kelvin (2000-9000). Only set when action is set_temperature."),
  reply: z.string().describe("A short, friendly reply to the user confirming the action."),
});

export type LightCommand = z.infer<typeof LightCommandSchema>;

export async function parseCommand(userMessage: string): Promise<LightCommand> {
  const { output } = await generateText({
    model: "anthropic/claude-haiku-4.5",
    output: Output.object({ schema: LightCommandSchema }),
    system: `You control smart home lights. Parse the user's message into a command.

Available devices:
- "floor lamp" (Floor Lamp Basic) — a floor lamp
- "led bulb" (Smart LED Bulb) — a light bulb
- "all" — both lights

Common color mappings:
- "warm" / "cozy" → set_temperature with 2700-3000K
- "cool" / "daylight" → set_temperature with 5000-6500K
- "red" → rgb(255,0,0), "blue" → rgb(0,0,255), "green" → rgb(0,255,0)
- "purple" → rgb(128,0,255), "pink" → rgb(255,105,180), "orange" → rgb(255,165,0)
- "white" → set_temperature with 5000K

If the user says "dim" without a number, use 30% brightness.
If the user says "bright" without a number, use 100% brightness.
Keep the reply short and casual (1 sentence).`,
    prompt: userMessage,
  });

  if (!output) {
    throw new Error("Failed to parse command from message");
  }

  return output;
}
