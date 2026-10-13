/** Mini App API: POST { action, initData, payload } → { ok, data } | { ok:false, error, code } */
import { corsHeaders } from '../_shared/runtime.ts';
import { getRuntime } from '../_shared/deno.ts';

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: true, ilova: "Sog'lom Ovqatlar" });
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 8 * 1024 * 1024) return json({ ok: false, error: 'So\'rov juda katta', code: 'xato' }, 413);
    body = JSON.parse(text || '{}');
  } catch {
    return json({ ok: false, error: 'JSON noto\'g\'ri', code: 'xato' });
  }
  return json(await getRuntime().handleApi(body));
});
