import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { parseCommand, type LightCommand } from "./parse-command";
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
    telegram: createTelegramAdapter({
      mode: process.env.TELEGRAM_POLLING === "true" ? "polling" : "auto",
    }),
  },
  state: createMemoryState(),
});

async function executeSingleCommand(command: LightCommand) {
  const targets =
    command.target === "all"
      ? getAllDevices()
      : [getDeviceByName(command.target)].filter(Boolean);

  if (targets.length === 0) {
    throw new Error(`Unknown device: ${command.target}`);
  }

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
        if (!command.color) throw new Error("Color value missing");
        await setColor(device.device, device.model, command.color as GoveeColor);
        break;
      case "set_brightness":
        if (command.brightness === undefined) throw new Error("Brightness value missing");
        await setBrightness(device.device, device.model, command.brightness);
        break;
      case "set_temperature":
        if (command.colorTemperature === undefined) throw new Error("Color temperature missing");
        await setColorTemperature(device.device, device.model, command.colorTemperature);
        break;
    }
  }
}

// Handle new DMs — in Telegram, all DMs trigger onNewMention automatically
bot.onNewMention(async (thread, message) => {
  await thread.startTyping();

  try {
    const result = await parseCommand(message.text);

    for (const command of result.commands) {
      await executeSingleCommand(command);
    }

    await thread.post(`success\n${result.reply}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Something went wrong";
    await thread.post(`failure\n${msg}`);
  }
});

export default bot;
