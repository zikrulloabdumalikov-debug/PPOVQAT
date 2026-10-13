/** Telegram bot webhook. setWebhook da secret_token beriladi, Telegram uni sarlavhada yuboradi. */
import { getRuntime } from '../_shared/deno.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  let update: Record<string, unknown>;
  try { update = await req.json(); } catch { return new Response('bad', { status: 400 }); }
  const res = await getRuntime().handleWebhook(update, req.headers.get('x-telegram-bot-api-secret-token'));
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } });
});
