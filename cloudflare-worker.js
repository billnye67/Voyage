/* =====================================================================
   VOYAGE TUTOR — Cloudflare Worker
   This file is the source of truth for the worker deployed at
   https://voyage-tutor.superjames735.workers.dev
   Deploy: paste into Cloudflare dashboard → Workers → voyage-tutor → Edit code.
   Requires a SECRET named ANTHROPIC_API_KEY (Settings → Variables & Secrets).
   The API key is never in this file or the repo.
   ===================================================================== */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    let body;
    try { body = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ error: 'bad JSON' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: body.system || '',
        messages: body.messages || [],
      }),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};
