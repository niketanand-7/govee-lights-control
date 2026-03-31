import { waitUntil } from "@vercel/functions";
import bot from "@/lib/bot";

export async function POST(request: Request) {
  return bot.webhooks.telegram(request, { waitUntil });
}
