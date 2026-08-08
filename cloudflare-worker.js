/* =====================================================================
   VOYAGE TUTOR — Cloudflare Worker (source of truth)
   Deployed at: https://voyage-tutor.superjames735.workers.dev
   Deploy: paste into Cloudflare dashboard → Workers → voyage-tutor → Edit code.
   Requires a SECRET named ANTHROPIC_API_KEY (Settings → Variables & Secrets).
   The API key is never in this file or the repo.
   ===================================================================== */
const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://voyage-57x.pages.dev",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.some(o => origin && origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad json" }, 400, cors);
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = typeof body.system === "string" ? body.system : "";
    if (!messages.length) {
      return json({ error: "no messages" }, 400, cors);
    }
    if (messages.length > 60) {
      return json({ error: "conversation too long" }, 400, cors);
    }

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1000,
          system,
          messages,
        }),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return json({ error: "upstream", detail: data }, upstream.status, cors);
      }
      return json({ content: data.content }, 200, cors);
    } catch (err) {
      return json({ error: "worker", detail: String(err) }, 500, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}
