// Local testing script — uses Telegram polling instead of webhooks
// No public URL needed. Run with: npx tsx --env-file=.env.local scripts/poll.ts

process.env.TELEGRAM_POLLING = "true";

import bot from "../src/lib/bot";

async function main() {
  console.log("Starting Telegram bot in polling mode...");
  console.log("Send a message to your bot on Telegram!");
  console.log("Press Ctrl+C to stop.\n");

  await bot.initialize();
}

main().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
