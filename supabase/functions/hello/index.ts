import "@supabase/functions-js/edge-runtime.d.ts";

export default {
  fetch(req: Request): Response {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }

    return Response.json({
      message: "hello, it-incubator",
      studentId: 5527,
    });
  },
};
