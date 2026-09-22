import { createClient } from "npm:@supabase/supabase-js@2";
import type { TelegramUser } from "./types.ts";

type MessageDirection = "incoming" | "outgoing";
type MessageType = "text" | "callback";

interface RecordMessageInput {
  user: TelegramUser;
  chatId: number;
  telegramMessageId?: number;
  telegramUpdateId?: number;
  direction: MessageDirection;
  messageType?: MessageType;
  text?: string;
  createdAt?: Date;
}

function getServiceRoleKey(): string {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    const parsed = JSON.parse(secretKeys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) return key;
  }

  throw new Error("Supabase service-role secret is unavailable.");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabase = createClient(supabaseUrl, getServiceRoleKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function recordMessage(input: RecordMessageInput): Promise<void> {
  const { error } = await supabase.rpc("record_telegram_message", {
    p_telegram_user_id: input.user.id,
    p_username: input.user.username ?? null,
    p_first_name: input.user.first_name ?? null,
    p_last_name: input.user.last_name ?? null,
    p_telegram_chat_id: input.chatId,
    p_telegram_message_id: input.telegramMessageId ?? null,
    p_telegram_update_id: input.telegramUpdateId ?? null,
    p_direction: input.direction,
    p_message_type: input.messageType ?? "text",
    p_text: input.text ?? null,
    p_created_at: (input.createdAt ?? new Date()).toISOString(),
  });

  if (error) throw new Error(`Unable to record message: ${error.message}`);
}

export async function recordMessageSafely(
  input: RecordMessageInput,
): Promise<void> {
  try {
    await recordMessage(input);
  } catch (error) {
    // A temporary database error must not stop Telegram replies.
    console.error("Message persistence failed", error);
  }
}
