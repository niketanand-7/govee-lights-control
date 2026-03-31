import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const huggingface = createOpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const SingleCommandSchema = z.object({
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
});

const LightCommandsSchema = z.object({
  commands: z.array(SingleCommandSchema).describe("One command per device/action. Use multiple commands when the user wants different things for different devices."),
  reply: z.string().describe("A short, friendly reply to the user confirming all actions."),
});

export type LightCommand = z.infer<typeof SingleCommandSchema>;
export type LightCommands = z.infer<typeof LightCommandsSchema>;

export async function parseCommand(userMessage: string): Promise<LightCommands> {
  const { output } = await generateText({
    model: huggingface("Qwen/Qwen2.5-7B-Instruct"),
    output: Output.object({ schema: LightCommandsSchema }),
    system: `You control smart home lights. Parse the user's message into one or more commands.

Available devices:
- "floor lamp" (Floor Lamp Basic) — a floor lamp
- "led bulb" (Smart LED Bulb) — a light bulb
- "all" — both lights (use when user says "lights", "everything", or doesn't specify a device)

Device aliases the user might say:
- "lamp", "floor light" → "floor lamp"
- "bulb", "light bulb", "LED", "smart bulb" → "led bulb"
- "lights", "both", "everything", "all lights" → "all"

If the user wants different things for different devices, return multiple commands.
Example: "floor lamp red and bulb orange" → two commands, one for each device.
Example: "turn off the lamp and set bulb to 50%" → two commands.

Actions:
- turn_on: "on", "turn on", "switch on", "enable", "light up"
- turn_off: "off", "turn off", "switch off", "kill", "shut off"
- set_color: any color name or RGB reference
- set_brightness: percentages, "dim", "bright", "max", "low"
- set_temperature: "warm", "cool", "cozy", "daylight", or specific Kelvin values

Color mappings:
- "red" → rgb(255,0,0), "blue" → rgb(0,0,255), "green" → rgb(0,128,0)
- "purple" / "violet" → rgb(128,0,255), "pink" → rgb(255,105,180)
- "orange" → rgb(255,165,0), "yellow" → rgb(255,255,0)
- "cyan" / "teal" → rgb(0,255,255), "magenta" → rgb(255,0,255)
- "warm white" → set_temperature 2700K, "cool white" → set_temperature 5000K
- "white" / "daylight" → set_temperature 5000K
- "warm" / "cozy" / "sunset" / "candlelight" → set_temperature 2700K
- "cool" / "focus" / "energize" → set_temperature 5500K
- Any custom color the user describes, pick the closest RGB

Brightness shortcuts:
- "dim" / "low" / "subtle" → 30%
- "bright" / "max" / "full" → 100%
- "half" / "medium" / "50" → 50%
- "night light" / "barely on" → 10%
- Any percentage mentioned → use that number

Scene shortcuts (combine multiple settings):
- "movie mode" / "movie time" → all lights dim to 20%, warm 2700K
- "reading" / "study" → set_temperature 5000K, brightness 80%
- "party" → set_color with a fun color like purple, brightness 100%
- "sleep" / "bedtime" / "goodnight" → turn_off all
- "morning" / "wake up" → turn_on all, brightness 100%, cool 5500K
- "relax" / "chill" → warm 2800K, brightness 40%
- "romantic" / "date night" → warm 2500K, brightness 20%

Keep the reply short, casual, and fun (1 sentence). Match the user's energy.`,
    prompt: userMessage,
  });

  if (!output) {
    throw new Error("Failed to parse command from message");
  }

  return output;
}
