import "@supabase/functions-js/edge-runtime.d.ts";

import {
  createAdminClient,
  jsonResponse,
} from "../_shared/admin.ts";

const PAGE_SIZE = 1000;

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }
    try {
      const supabase = createAdminClient();
      const messages: unknown[] = [];

      for (let from = 0;; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("messages")
          .select("*, client:clients(telegram_user_id, username, first_name, last_name)")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        messages.push(...data);
        if (data.length < PAGE_SIZE) break;
      }

      return jsonResponse(messages);
    } catch (error) {
      console.error("Unable to list messages", error);
      return jsonResponse({ error: "Unable to load messages" }, 500);
    }
  },
};
