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
      const clients: unknown[] = [];

      for (let from = 0;; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .order("last_message_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        clients.push(...data);
        if (data.length < PAGE_SIZE) break;
      }

      return jsonResponse(clients);
    } catch (error) {
      console.error("Unable to list clients", error);
      return jsonResponse({ error: "Unable to load clients" }, 500);
    }
  },
};
