# Sog'lom Ovqatlar — web ilova (V1)

Excel o'rniga bitta tizim: mijoz o'zi buyurtma beradi, yetkazuvchi manzil bo'yicha ishlaydi,
sheriklar foyda-zararni real vaqtda ko'radi. TZ: *"Soglom Ovqatlar — web ilova texnik topshirig'i"*.

**Stek:** Telegram Mini App (HTML/JS) + **Supabase** (Postgres + Edge Functions, TypeScript/Deno).
Avvalgi Apps Script + Google Sheets backend `backend/` da saqlangan (zaxira yo'l).
Supabase'ga o'rnatish, deploy va Telegram'da sinash: **[docs/SUPABASE.md](docs/SUPABASE.md)**.

```
supabase/   Edge Functions, biznes mantiq, migratsiyalar (asosiy backend)
backend/    Apps Script kodi (.gs) — avvalgi backend, o'chirilmagan
frontend/   Mini App (statik sayt): mijoz, admin panel, kuryer ekrani — bitta ilova, rolga qarab ochiladi
test/       Qabul mezonlari (TZ 12) va biznes qoidalar: test/supabase (Postgres) va Apps Script nusxasi
dev/        Lokal dev server (Telegramsiz sinash)
docs/       TZ bo'yicha bajarilish jadvali
```

## Tez boshlash (lokal)

```bash
npm test        # Supabase (34) + Apps Script (33) testlari: TZ 12-bo'limdagi 12 mezon + biznes qoidalar
npm run dev     # http://localhost:8080 — foydalanuvchini tanlab kirasiz (sherik, operator, kuryer, mijoz, yangi)
```

Dev server backend kodini o'zgarishsiz, xotiradagi Sheets nusxasida ishlatadi va 100 mijoz / 300 buyurtma
bilan to'ldiradi. Telegram imzosi baribir tekshiriladi (dev tokeni bilan). Pastdagi 🧪 panel: foydalanuvchini
almashtirish, 📱 botga kontakt yuborish (ro'yxatdan o'tish uchun), 💬 bot yuborgan xabarlar.

## O'rnatish: Apps Script varianti (avvalgi)

1. **Bot.** @BotFather → `/newbot` → tokenni oling.
2. **Baza.** Biznesning umumiy Google akkauntida (kamida ikki sherik egalik bilan, TZ 11.4) yangi Google Sheets yarating.
   Faqat sheriklarga ulashing, "havola orqali" ochmang.
3. **Skript.** Sheets → *Kengaytmalar → Apps Script*. `backend/` dagi barcha `.gs` fayllarni va `appsscript.json`
   ni joylang (yoki `clasp push` — `backend/.claspignore` tayyor).
4. **Script Properties** (*Project Settings → Script Properties*), maxfiy kalitlar kodda emas (TZ 11.1):
   | Kalit | Qiymat |
   |---|---|
   | `BOT_TOKEN` | BotFather tokeni |
   | `ADMIN_TG_IDS` | Sheriklarning Telegram ID lari, vergul bilan (botga `/id` yozib bilinadi) |
   | `WEBAPP_URL` | Mini App manzili (5-qadam), masalan `https://<user>.github.io/PPOVQAT/` |
   | `SPREADSHEET_ID` | ixtiyoriy — skript jadvalga bog'lanmagan bo'lsa |
5. **Frontend.** `frontend/config.js` da `API_URL` ni web app manziliga almashtiring va `frontend/` ni HTTPS
   statik hostingga joylang. Repoda GitHub Pages workflow bor (`.github/workflows/pages.yml`):
   *Settings → Pages → Source: GitHub Actions*, `API_URL` ni repo *Variables* ga `API_URL` nomi bilan yozing.
6. Apps Script muharririda ketma-ket ishga tushiring:
   - `setup` — 18 varaq, sarlavhalar, standart sozlamalar, xarajat turkumlari, sheriklar;
   - `seedExample` — TZ dagi misol: Ozish Express 120 000 so'm/kun, tannarx 44 800 + 22 000, paketlar 6/12/24 kun (0/5/10%), keshbek 3%, 60 kun, 30% gacha (keyin admin paneldan o'zgartiriladi);
   - **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone*. `/exec` manzilini `API_URL` sifatida ishlating;
   - `installTriggers` — har 15 daqiqada `cronTick` (eslatmalar, kesish vaqti, zaxira);
   - `setWebhook` — bot webhooki (maxfiy kalit bilan) va chatdagi "Ilova" menyu tugmasi.
7. Botda `/start` → "Ilovani ochish". Sherik admin panelni ko'radi: *Sozlamalar*da karta raqami, hududlar,
   kuryerlar guruhi chat ID; *Foydalanuvchilar*da operator va kuryerlarni qo'shing.

**Kuryerlar zaxira guruhi (TZ 11.4):** yopiq Telegram guruh yarating, botni qo'shing, guruh chat ID sini
(`-100…`) *Sozlamalar → Telegram* ga yozing. Har kuni kesish vaqtida ertangi ro'yxat matn ko'rinishida yuboriladi.

**Tezlik sinovi (TZ 12):** sinov jadvalida `ALLOW_TEST_SEED=ha` qo'yib `seedTestData` ni ishga tushiring
(100 mijoz, 300 buyurtma) va ekranlar ochilish vaqtini o'lchang. Lokal testlar mantiqiy qismni tekshiradi;
haqiqiy Sheets kechikishini faqat joyida o'lchash mumkin.

## Rollar (TZ 2)

| Rol | Ko'radi / qiladi |
|---|---|
| Mijoz | o'z profili, istalgan kunlik buyurtma (1 kundan 1 yilgacha), narxlar jadvali, 6 kunlik menyu rasmi, kaloriya tavsiyasi va vazn tarixi, qolgan kunlar, keshbek, pauza, manzillar |
| Sherik (admin) | hammasi: xarajat, oylik, dashboard, narx, sozlamalar, foydalanuvchilar, audit |
| Operator | bugun, buyurtmalar (to'lov tasdiqlash), mijozlar, menyu, yetkazish — moliyasiz |
| Kuryer | faqat o'ziga biriktirilgan bugungi yetkazishlar: ism, telefon, manzil, mo'ljal, ratsion |

Rol har so'rovda serverda Telegram ID bo'yicha qayta tekshiriladi; mijoz id si so'rovdan emas, imzolangan
Telegram ID dan olinadi.

## Ochiq savollar (TZ 13) — standart qiymatlar

Hammasi admin panel → *Sozlamalar* / *Narx va paketlar* dan o'zgaradi; kod o'zgarmaydi.

| # | Savol | Hozirgi standart |
|---|---|---|
| 1, 3 | Keshbek foizi, muddati, chegarasi | 3%, 60 kun, Jami ning 30% gacha |
| 2 | Paket chegirmalari | 6/12/24 kun: 0/5/10% |
| 5 | Naqd pulni kuryer yig'adimi | Yo'q (V1), naqd — admin qabul qiladi |
| 6 | Kesish vaqti | 18:00 |
| 7 | Pauza va bekor qilish | 20% gacha; bekorda chegirma ishlatilgan kunlar bo'yicha qayta hisoblanadi |
| 8 | Bizning ayb bilan yetkazilmasa | Kun oxiriga qo'shiladi (yoki "keshbek" rejimi) |
| 9 | Dam kunlari | Yakshanba + Sozlamadagi bayramlar |
| 10 | Hududlar | Chilonzor, Yunusobod, Mirzo Ulug'bek, Yakkasaroy, Sergeli |
| 11 | Katta xarajat tasdig'i | 5 000 000 so'm dan katta — ikkinchi sherik |
| 4, 13, 14 | Karta, akkaunt egasi, rozilik matni | Sheriklar hal qiladi; rozilik matni Sozlamada (yurist ko'rib chiqishi kerak) |

TZ talablari qanday bajarilgani: [docs/TZ_BAJARILISHI.md](docs/TZ_BAJARILISHI.md).
