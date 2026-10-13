// Telegram webhook'ni Supabase "telegram-webhook" funksiyasiga ulaydi va chatdagi "Ilova" tugmasini o'rnatadi.
// Ishlatish: .env ni to'ldiring, keyin:  node --env-file=.env scripts/set-webhook.mjs
//   --info   — joriy webhook holatini ko'rsatish
// Sirlar faqat .env / muhitdan o'qiladi va hech qayerga yozilmaydi.
const { BOT_TOKEN, WEBHOOK_SECRET, SUPABASE_PROJECT_REF = 'ewxrdloawszmxyojlzdh', WEBAPP_URL } = process.env;
if (!BOT_TOKEN) { console.error('BOT_TOKEN yo\'q (.env)'); process.exit(1); }
const tg = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
  });
  return r.json();
};
if (process.argv.includes('--info')) {
  const info = await tg('getWebhookInfo');
  if (info.result) delete info.result.ip_address;
  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
}
if (!WEBHOOK_SECRET || !/^[A-Za-z0-9_-]{16,256}$/.test(WEBHOOK_SECRET)) {
  console.error('WEBHOOK_SECRET kamida 16 belgi (A-Z a-z 0-9 _ -) bo\'lishi kerak va Supabase Secrets dagi bilan bir xil bo\'lsin');
  process.exit(1);
}
const url = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/telegram-webhook?forceFunctionRegion=ap-southeast-2`;
const res = await tg('setWebhook', { url, secret_token: WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: false });
console.log('setWebhook:', res.ok ? 'OK' : res.description);
if (WEBAPP_URL) {
  const mb = await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ilova', web_app: { url: WEBAPP_URL } } });
  console.log('Menyu tugmasi:', mb.ok ? 'OK' : mb.description);
}
const info = await tg('getWebhookInfo');
console.log('Webhook:', info.result && info.result.url, '| kutilayotgan:', info.result && info.result.pending_update_count,
  info.result && info.result.last_error_message ? '| oxirgi xato: ' + info.result.last_error_message : '');
