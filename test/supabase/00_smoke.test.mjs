import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, placePaidOrder } from './helpers.mjs';

test('smoke: auth, ro\'yxat, buyurtma, to\'lov, faollashish', async () => {
  const env = await makeEnv();
  const me = await env.ok(env.IDS.clientA, 'me');
  assert.equal(me.rol, 'mijoz');
  const cat = await env.ok(env.IDS.clientA, 'discounts');
  assert.deepEqual(cat.ratsionlar[0].paketlar.map((p) => [p.kunlar, p.jami, p.yangi_keshbek]), [[6, 720000, 21600], [12, 1368000, 41040], [24, 2592000, 77760]]);
  const o = await placePaidOrder(env, env.IDS.clientA, 6);
  assert.equal(o.holat, 'faol');
  assert.deepEqual(o.kunlar_jadvali.map((k) => k.sana), ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20']);
  assert.equal((await env.ok(env.IDS.clientA, 'cashback')).balans, 21600);
});
