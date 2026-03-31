// Local testing script — uses Telegram polling instead of webhooks
// Run with: node --experimental-strip-types --env-file=.env.local scripts/poll.mjs

process.env.TELEGRAM_POLLING = "true";

const { createTelegramAdapter } = await import("@chat-adapter/telegram");
const { createMemoryState } = await import("@chat-adapter/state-memory");
const { Chat } = await import("chat");

const { parseCommand } = await import("../src/lib/parse-command.ts");
const govee = await import("../src/lib/govee.ts");

const bot = new Chat({
  userName: "govee-lights",
  adapters: {
    telegram: createTelegramAdapter({ mode: "polling" }),
  },
  state: createMemoryState(),
});

async function executeSingleCommand(command) {
  const targets =
    command.target === "all"
      ? govee.getAllDevices()
      : [govee.getDeviceByName(command.target)].filter(Boolean);

  for (const device of targets) {
    if (!device) continue;
    console.log("[bot] Executing", command.action, "on", device.name);
    switch (command.action) {
      case "turn_on":
        await govee.turnLight(device.device, device.model, true);
        break;
      case "turn_off":
        await govee.turnLight(device.device, device.model, false);
        break;
      case "set_color":
        if (!command.color) throw new Error("Color value missing");
        await govee.setColor(device.device, device.model, command.color);
        break;
      case "set_brightness":
        if (command.brightness === undefined) throw new Error("Brightness value missing");
        await govee.setBrightness(device.device, device.model, command.brightness);
        break;
      case "set_temperature":
        if (command.colorTemperature === undefined) throw new Error("Color temperature missing");
        await govee.setColorTemperature(device.device, device.model, command.colorTemperature);
        break;
    }
  }
}

bot.onNewMention(async (thread, message) => {
  await thread.startTyping();
  try {
    const result = await parseCommand(message.text);
    console.log("[bot] Parsed commands:", JSON.stringify(result));

    for (const command of result.commands) {
      await executeSingleCommand(command);
    }

    await thread.post(result.reply);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Something went wrong";
    console.error("[bot] Error:", msg);
    await thread.post(`Sorry, I couldn't do that: ${msg}`);
  }
});

console.log("Starting Telegram bot in polling mode...");
console.log("Send a message to @niket_govee_bot on Telegram!");
console.log("Press Ctrl+C to stop.\n");

await bot.initialize();
