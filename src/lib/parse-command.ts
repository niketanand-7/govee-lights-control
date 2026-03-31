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
    .describe("RGB color. ONLY include when action is 'set_color'. Do NOT include for set_temperature."),
  brightness: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Brightness 0-100. ONLY include when action is 'set_brightness'."),
  colorTemperature: z
    .number()
    .min(2000)
    .max(9000)
    .optional()
    .describe("REQUIRED when action is 'set_temperature'. Kelvin value like 2700, 5000, 5500. Must be a number."),
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

Preset modes (EXACT settings, do not deviate):
- "coding time" / "coding mode" / "code" → floor lamp: set_color purple rgb(128,0,255) + brightness 100% + led bulb: set_color vivid orange rgb(255,100,0) + brightness 100%
- "meeting time" / "meeting mode" / "meeting" → both lights: set_temperature 5000K (white light) + brightness 100%
- "normal light" / "normal mode" / "normal" → both lights: set_color warm orange rgb(255,140,0) + brightness 80%

Scene shortcuts (combine multiple commands):
- "movie mode" / "movie time" → command 1: set_temperature target "all" colorTemperature 2700 + command 2: set_brightness target "all" brightness 20
- "reading" / "study" → command 1: set_temperature target "all" colorTemperature 5000 + command 2: set_brightness target "all" brightness 80
- "party" → command 1: set_color target "all" color rgb(128,0,255) + command 2: set_brightness target "all" brightness 100
- "sleep" / "bedtime" / "goodnight" → command 1: turn_off target "all"
- "morning" / "wake up" → command 1: turn_on target "all" + command 2: set_temperature target "all" colorTemperature 5500 + command 3: set_brightness target "all" brightness 100
- "relax" / "chill" → command 1: set_temperature target "all" colorTemperature 2800 + command 2: set_brightness target "all" brightness 40
- "romantic" / "date night" → command 1: set_temperature target "all" colorTemperature 2500 + command 2: set_brightness target "all" brightness 20

IMPORTANT: When action is "set_temperature", you MUST set "colorTemperature" to a number (e.g. 5000). Do NOT put color RGB values instead.

Keep the reply short, casual, and fun (1 sentence). Match the user's energy.`,
    prompt: userMessage,
  });

  if (!output) {
    throw new Error("Failed to parse command from message");
  }

  return output;
}
