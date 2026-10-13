# Supabase'ga o'tish: o'rnatish va Telegram'da sinash

Backend endi Supabase'da: Postgres + 3 ta Edge Function (`api`, `telegram-webhook`, `cron`).
Apps Script kodi (`backend/`) o'chirilmagan: webhook qayta ulansa, eski tizim ishlashda davom etadi.

## Tuzilma

```
supabase/
  logic/*.js                 biznes mantiq (Apps Script'dan o'zgarishsiz ko'chirilgan, TZ 5, 9, 10)
  functions/_shared/logic.ts ↑ shulardan yig'ilgan modul (npm run build:logic) — qo'lda tahrirlanmaydi
  functions/_shared/runtime.ts initData tekshiruvi, tranzaksiya + qulf, jadval yuklash, Telegram, zaxira
  functions/_shared/deno.ts  Postgres ulanishi, Storage, sirlar (faqat Deno)
  functions/api              Mini App so'rovlari
  functions/telegram-webhook bot yangilanishlari
  functions/cron             har 15 daqiqada (pg_cron)
  migrations/                sxema (remote'ga qo'llangan)
  seed/misol_narxlar.sql     ixtiyoriy misol narxlar
```

Har bir so'rov bitta Postgres tranzaksiyasida bajariladi. Yozuvchi amallar `pg_advisory_xact_lock` oladi:
ikki kishi bir vaqtda yozsa, navbat bilan ishlaydi. Xato bo'lsa hech narsa yozilmaydi.
Mijoz so'rovida bazadan faqat shu mijozning qatorlari o'qiladi.

## 1. Sirlar (bir marta)

**Supabase → Edge Functions → Secrets** (kodda va git'da yo'q):

| Kalit | Qiymat |
|---|---|
| `BOT_TOKEN` | BotFather tokeni |
| `ADMIN_TG_IDS` | sheriklarning Telegram ID lari, vergul bilan (birinchi kirganda sherik bo'ladi) |
| `WEBAPP_URL` | `https://zikrulloabdumalikov-debug.github.io/PPOVQAT/` |
| `WEBHOOK_SECRET` | tasodifiy 32+ belgi (A-Z a-z 0-9 _ -) |
| `CRON_SECRET` | tasodifiy 32+ belgi |

`SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` Supabase tomonidan avtomatik beriladi.

**Cron uchun Vault** (SQL Editor, bir marta; `CRON_SECRET` bilan bir xil qiymat):

```sql
select vault.create_secret('https://ewxrdloawszmxyojlzdh.supabase.co', 'project_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

`soglom-cron` jadvali allaqachon qo'yilgan, Vault sirlari bo'lmaguncha hech narsa chaqirmaydi.

## 2. Funksiyalarni deploy qilish

Variant A — GitHub Actions: repo *Settings → Secrets* ga `SUPABASE_ACCESS_TOKEN` qo'shing,
keyin *Actions → Edge Functions deploy → Run workflow* (avval testlar o'tadi).

Variant B — o'z kompyuteringizdan:

```bash
npx supabase login
npx supabase functions deploy api telegram-webhook cron --project-ref ewxrdloawszmxyojlzdh --no-verify-jwt
```

`--no-verify-jwt`: kirish Telegram imzosi / webhook secret / cron secret bilan tekshiriladi.
Frontend'ga hech qanday Supabase kaliti kerak emas (anon key ham).

Ixtiyoriy: `supabase/seed/misol_narxlar.sql` ni SQL Editor'da ishga tushiring (TZ dagi misol narxlar).

## 3. Telegram webhook'ni yangi manzilga ulash

```bash
cp .env.example .env      # BOT_TOKEN va WEBHOOK_SECRET ni yozing (Supabase Secrets bilan bir xil)
npm run set-webhook       # webhook + "Ilova" menyu tugmasi
node --env-file=.env scripts/set-webhook.mjs --info   # holatni tekshirish
```

Orqaga qaytish: Apps Script muharririda `setWebhook()` ni ishga tushirsangiz, bot yana eski tizimga ulanadi.

## 4. Mini App'ni yangi backend'ga o'tkazish

`frontend/config.js` dagi `API_URL` yangi funksiyaga qaratilgan
(`https://ewxrdloawszmxyojlzdh.supabase.co/functions/v1/api?forceFunctionRegion=ap-southeast-2` —
funksiya baza bilan bir regionda ishlaydi). Ammo `pages.yml` repo *Variables* dagi `API_URL` ni ustun qo'yadi,
shuning uchun hozir jonli Mini App hali Apps Script'ga ulangan.

O'tish (1–3-qadamlardan keyin): GitHub → *Settings → Secrets and variables → Actions → Variables* →
`API_URL` ni yuqoridagi manzilga o'zgartiring (yoki o'chiring) → *Actions → Mini App (GitHub Pages) → Run workflow*.
Orqaga qaytish: `API_URL` ni eski Apps Script `/exec` manziliga qaytaring va workflow'ni qayta ishga tushiring.

Webhook (3-qadam) va Mini App (4-qadam) birga o'tkazilsin: aks holda bot bir bazaga, ilova boshqasiga yozadi.

## 5. Telegram'da sinash (tartib bilan)

1. Botga `/start` → "Ilovani ochish" tugmasi chiqadi. `/id` → Telegram ID ingiz.
2. Sherik (ID `ADMIN_TG_IDS` da) ilovani ochadi → admin panel. *Narx va paketlar*: ratsion, narx, paket kiriting
   (yoki misol SQL). *Sozlamalar*: karta raqami, hududlar. *Foydalanuvchilar*: operator va kuryer qo'shing.
3. Boshqa telefondan mijoz: ilova → "Raqamni ulashish" → ism, manba, xaritada manzil → Ro'yxatdan o'tish.
4. Mijoz buyurtma beradi → chek rasmini yuboradi (yoki botga rasm) → sherik/operatorga xabar keladi.
5. Operator *Bugun → To'lov kutmoqda* → chekni ko'radi → Tasdiqlash → mijozga "Buyurtmangiz tasdiqlandi".
   Tasdiqni ikki marta bosib ko'ring: keshbek bir marta hisoblanadi.
6. Mijoz *Buyurtmalarim* → kunni bosib pauza qiladi (kesish vaqtigacha).
7. Kuryer ilovani ochadi (yetkazish kuni) → "Yo'ldaman", "Yetkazildi" → mijozga xabar.
8. Sherik *Dashboard*, *Xarajat* (5 mln dan katta — ikkinchi sherik tasdiqlaydi), *Oyliklar*.
9. Kesish vaqtidan keyin kuryerlar guruhiga ertangi ro'yxat keladi (Sozlamalarda guruh chat ID kiritilgan bo'lsa).

Muammo bo'lsa: Supabase → Edge Functions → Logs (`api`, `telegram-webhook`, `cron`).

## Sinovlar

```bash
npm test                 # Supabase backend (34) + Apps Script backend (33)
npm run test:supabase    # faqat Supabase: lokal Postgres 16 ko'tariladi, migratsiyalar qo'llanadi
```

`test:supabase` Edge Function kodini (runtime.ts + logic.ts) Node 22 da haqiqiy Postgres'ga qarshi ishlatadi.
TZ 12-bo'limdagi 12 mezon `test/supabase/acceptance.test.mjs` da. Bir vaqtdagi yozuv (9-mezon) haqiqiy
parallel so'rovlar bilan tekshiriladi.
