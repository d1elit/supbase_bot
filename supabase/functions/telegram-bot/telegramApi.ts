type InlineKeyboard = Array<Array<{
  text: string;
  callback_data: string;
}>>;

import type { TelegramMessage } from "./types.ts";

export interface SendMessageOptions {
  parse_mode?: "HTML";
  reply_markup?: { inline_keyboard: InlineKeyboard };
}

export function createTelegramApi(token: string) {
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  const baseUrl = `https://api.telegram.org/bot${token}/`;

  async function call<T>(method: string, payload: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null) as
      | { ok?: boolean; description?: string; result?: T }
      | null;
    if (!response.ok || !result?.ok || result.result === undefined) {
      throw new Error(
        `Telegram ${method} failed: ${result?.description ?? response.status}`,
      );
    }
    return result.result;
  }

  return {
    sendMessage(chatId: number, text: string, options: SendMessageOptions = {}) {
      return call<TelegramMessage>("sendMessage", {
        chat_id: chatId,
        text,
        ...options,
      });
    },
    answerCallbackQuery(callbackQueryId: string, text?: string) {
      return call<boolean>("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      });
    },
  };
}
