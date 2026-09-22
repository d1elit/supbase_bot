CREATE OR REPLACE FUNCTION public.record_telegram_message(
  p_telegram_user_id BIGINT,
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_telegram_chat_id BIGINT,
  p_telegram_message_id BIGINT,
  p_telegram_update_id BIGINT,
  p_direction TEXT,
  p_message_type TEXT,
  p_text TEXT,
  p_created_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_direction NOT IN ('incoming', 'outgoing') THEN
    RAISE EXCEPTION 'Invalid message direction';
  END IF;

  IF p_message_type NOT IN ('text', 'callback') THEN
    RAISE EXCEPTION 'Invalid message type';
  END IF;

  INSERT INTO public.clients (
    telegram_user_id,
    username,
    first_name,
    last_name,
    last_message_at,
    last_message_sender
  )
  VALUES (
    p_telegram_user_id,
    p_username,
    p_first_name,
    p_last_name,
    p_created_at,
    CASE WHEN p_direction = 'incoming' THEN 'client' ELSE 'bot' END
  )
  ON CONFLICT (telegram_user_id) DO UPDATE
  SET username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW(),
      last_message_at = CASE
        WHEN EXCLUDED.last_message_at >= clients.last_message_at
          THEN EXCLUDED.last_message_at
        ELSE clients.last_message_at
      END,
      last_message_sender = CASE
        WHEN EXCLUDED.last_message_at >= clients.last_message_at
          THEN EXCLUDED.last_message_sender
        ELSE clients.last_message_sender
      END;

  INSERT INTO public.messages (
    client_id,
    telegram_chat_id,
    telegram_message_id,
    telegram_update_id,
    direction,
    message_type,
    text,
    created_at
  )
  VALUES (
    p_telegram_user_id,
    p_telegram_chat_id,
    p_telegram_message_id,
    p_telegram_update_id,
    p_direction,
    p_message_type,
    p_text,
    p_created_at
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_telegram_message(
  BIGINT, TEXT, TEXT, TEXT, BIGINT, BIGINT, BIGINT,
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_telegram_message(
  BIGINT, TEXT, TEXT, TEXT, BIGINT, BIGINT, BIGINT,
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
