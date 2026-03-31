import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { parseCommand } from "./parse-command";
import {
  turnLight,
  setBrightness,
  setColor,
  setColorTemperature,
  getDeviceByName,
  getAllDevices,
  type GoveeColor,
} from "./govee";

const bot = new Chat({
  userName: "govee-lights",
  adapters: {
    telegram: createTelegramAdapter(),
  },
  state: createMemoryState(),
});

async function executeCommand(command: Awaited<ReturnType<typeof parseCommand>>) {
  const targets =
    command.target === "all"
      ? getAllDevices()
      : [getDeviceByName(command.target)].filter(Boolean);

  if (targets.length === 0) {
    throw new Error(`Unknown device: ${command.target}`);
  }

  const results: string[] = [];

  for (const device of targets) {
    if (!device) continue;

    switch (command.action) {
      case "turn_on":
        await turnLight(device.device, device.model, true);
        break;
      case "turn_off":
        await turnLight(device.device, device.model, false);
        break;
      case "set_color":
        if (command.color) {
          await setColor(device.device, device.model, command.color as GoveeColor);
        }
        break;
      case "set_brightness":
        if (command.brightness !== undefined) {
          await setBrightness(device.device, device.model, command.brightness);
        }
        break;
      case "set_temperature":
        if (command.colorTemperature !== undefined) {
          await setColorTemperature(device.device, device.model, command.colorTemperature);
        }
        break;
    }

    results.push(device.name);
  }

  return results;
}

// Handle new DMs — in Telegram, all DMs trigger onNewMention automatically
bot.onNewMention(async (thread, message) => {
  await thread.startTyping();

  try {
    const command = await parseCommand(message.text);
    await executeCommand(command);
    await thread.post(command.reply);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Something went wrong";
    await thread.post(`Sorry, I couldn't do that: ${msg}`);
  }
});

export default bot;
