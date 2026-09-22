import "@supabase/functions-js/edge-runtime.d.ts";

import { recordMessageSafely } from "./database.ts";
import { getStandings } from "./footballApi.ts";
import { formatStandings } from "./formatStandings.ts";
import { leagueHints } from "./helpText.ts";
import { leagues, resolveLeagueId } from "./leagues.ts";
import { createTelegramApi } from "./telegramApi.ts";
import type { TelegramUpdate, TelegramUser } from "./types.ts";

const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const footballApiKey = Deno.env.get("FOOTBALL_DATA_API_KEY") ?? "";
const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

function isCommand(text: string, command: string): boolean {
  return new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`, "i").test(text);
}

function leaguesKeyboard() {
  return {
    inline_keyboard: Array.from(leagues, ([id, name]) => [{
      text: name,
      callback_data: `league:${id}`,
    }]),
  };
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const telegram = createTelegramApi(telegramToken);

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message?.chat.id;
    if (chatId !== undefined) {
      await recordMessageSafely({
        user: callback.from,
        chatId,
        telegramUpdateId: update.update_id,
        direction: "incoming",
        messageType: "callback",
        text: callback.data,
      });
    }
    const match = callback.data?.match(/^league:([a-z0-9-]+)$/);
    if (!match || !leagues.has(match[1])) {
      await telegram.answerCallbackQuery(callback.id, "Неизвестная лига.");
      return;
    }

    await telegram.answerCallbackQuery(callback.id);
    if (callback.message) {
      await showStandings(callback.message.chat.id, match[1], callback.from);
    }
    return;
  }

  const message = update.message;
  if (!message?.text) return;
  const text = message.text.trim();
  const user = message.from;
  if (user) {
    await recordMessageSafely({
      user,
      chatId: message.chat.id,
      telegramMessageId: message.message_id,
      telegramUpdateId: update.update_id,
      direction: "incoming",
      text: message.text,
      createdAt: message.date ? new Date(message.date * 1000) : undefined,
    });
  }

  if (isCommand(text, "start")) {
    await sendTrackedMessage(user, message.chat.id, `Привет! ⚽\n\n${leagueHints}`);
    return;
  }
  if (isCommand(text, "help")) {
    await sendTrackedMessage(user, message.chat.id, leagueHints);
    return;
  }
  if (isCommand(text, "leagues")) {
    await sendTrackedMessage(user, message.chat.id, "Выбери чемпионат:", {
      reply_markup: leaguesKeyboard(),
    });
    return;
  }

  const leagueId = resolveLeagueId(text);
  if (leagueId) {
    await showStandings(message.chat.id, leagueId, user);
  } else {
    await sendTrackedMessage(user, message.chat.id, "Выбери чемпионат:", {
      reply_markup: leaguesKeyboard(),
    });
  }
}

async function sendTrackedMessage(
  user: TelegramUser | undefined,
  chatId: number,
  text: string,
  options: Parameters<ReturnType<typeof createTelegramApi>["sendMessage"]>[2] = {},
): Promise<void> {
  const telegram = createTelegramApi(telegramToken);
  const sent = await telegram.sendMessage(chatId, text, options);
  if (user) {
    await recordMessageSafely({
      user,
      chatId,
      telegramMessageId: sent.message_id,
      direction: "outgoing",
      text,
      createdAt: sent.date ? new Date(sent.date * 1000) : undefined,
    });
  }
}

async function showStandings(
  chatId: number,
  leagueId: string,
  user?: TelegramUser,
): Promise<void> {
  let standings;
  try {
    standings = await getStandings(leagueId, footballApiKey);
  } catch (error) {
    console.error("Unable to load standings", error);
    await sendTrackedMessage(
      user,
      chatId,
      "Не удалось загрузить турнирную таблицу. Сервис может быть недоступен или лимит запросов исчерпан. Попробуйте позже.",
    );
    return;
  }

  if (!standings) {
    await sendTrackedMessage(
      user,
      chatId,
      "Текущая турнирная таблица для этой лиги пока недоступна.",
    );
    return;
  }

  for (const text of formatStandings(leagues.get(leagueId)!, standings)) {
    await sendTrackedMessage(user, chatId, text, { parse_mode: "HTML" });
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "GET") {
      return Response.json({ status: "ok" });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, POST" },
      });
    }

    if (
      webhookSecret &&
      req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const update = await req.json() as TelegramUpdate;
      await handleUpdate(update);
      return Response.json({ ok: true });
    } catch (error) {
      console.error("Failed to process Telegram update", error);
      return Response.json({ ok: false }, { status: 500 });
    }
  },
};
