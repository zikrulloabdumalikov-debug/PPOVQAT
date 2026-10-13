/** pg_cron (pg_net) har 15 daqiqada chaqiradi; x-cron-secret sarlavhasi tekshiriladi. */
import { getRuntime } from '../_shared/deno.ts';

Deno.serve(async (req) => {
  const res = await getRuntime().handleCron(req.headers.get('x-cron-secret'));
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } });
});
