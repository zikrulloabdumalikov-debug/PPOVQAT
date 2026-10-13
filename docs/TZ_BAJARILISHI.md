# TZ bo'yicha bajarilish jadvali

Har bir bo'lim — qayerda amalga oshirilgan va qaysi test tekshiradi.
`A-n` = `test/acceptance.test.js` dagi n-test, `R` = `test/rules.test.js`.

## 1. Qamrov
V1 ning 5 qismi: mijoz kabineti (`frontend/js/client.js`), admin panel (`admin.js`, `admin2.js`),
dastavka (`courier.js`, `backend/08_Delivery.gs`), xarajat va oyliklar (`09_Expenses.gs`), dashboard (`10_Dashboard.gs`).
V1 cheklovlari saqlangan: onlayn to'lov yo'q (naqd/karta, admin tasdiqlaydi), marshrut optimallash yo'q, xabarlar faqat Telegram.

## 2. Rollar va huquqlar
| Talab | Amalga oshirilishi | Test |
|---|---|---|
| 4 rol, Telegram orqali kirish, parolsiz | `04_Auth.gs` (initData imzosi), `Foydalanuvchilar` varag'i | A-7 |
| Sherik/kuryer ro'yxatini faqat admin qo'shadi | `userSave`, `userDeactivate` — faqat sherik | A-8 |
| Server har so'rovda rolni qayta tekshiradi | `15_Api.gs` — `ACTIONS` jadvali, yozishda qulf ichida qayta o'qiladi | A-6, A-8 |

## 3. Texnologiya
Mini App + Apps Script + Sheets; Leaflet/OSM; Telegram bot; LockService; kunlik zaxira trigger.
Jadvallar relyatsion (har qatorda `id`, ismlar bo'yicha bog'lanmaydi) — Supabase/Firebase ga ko'chirish oson.

## 4. Ma'lumotlar modeli
`backend/00_Config.gs` → `SCHEMA`: TZ dagi 17 varaq + `Menyu` (admin "Menyu" bo'limi uchun kerak).
TZ dagi asosiy maydonlarga qo'shimcha: ratsion tannarxi (marja qo'riqchisi uchun), buyurtmada keshbek foizi/muddati
snapshoti, `kunlik_daromad`, to'lov holati va chek, xarajat davri/manbasi/sherigi.
- Hech narsa o'chirilmaydi (`faol = yo'q`) — barcha "o'chirish" amallari.
- Sana `YYYY-MM-DD`, vaqt zonasi Asia/Tashkent, pul butun so'm (`money_`).
- Sheriklar Sheetsni qo'lda tahrirlamaydi: `setup` varaqlarga "faqat ilova orqali" himoyasini qo'yadi.

## 5. Biznes qoidalar
| Talab | Qayerda | Test |
|---|---|---|
| 5.1 Jami = N×P×(1−D), To'lanadi, YangiKeshbek = K×To'lanadi; keshbekdan keshbek yo'q | `calcQuote_` | A-4b, smoke (TZ jadvali: 720 000 / 1 368 000 / 2 592 000) |
| 5.2 Versiyalash "qachondan" bilan, snapshot | `latestVersion_`, `createOrder_` | A-1 |
| 5.2 48 soat narx kafolati, keyin qayta hisob | `refreshStaleOrder_`, soatlik job | R |
| 5.3 Balans, FIFO, amal muddati, 30% chegara | `06_Cashback.gs` | A-4, A-4b |
| 5.4 Eng erta sana (kesish vaqti), N ta yetkazish, yakshanba/bayram o'tkaziladi | `earliestStart_`, `deliveryDates_` | A-2, A-2b |
| 5.5 Pauza (kesish vaqtigacha, 20% chegara, oxiriga suriladi) | `pauseDay_`, `unpauseDay_` | A-3, A-3b |
| 5.5 Mijoz aybi — kun kuyadi; bizning ayb — keyinga yoki keshbek | `markFailed_` | R |
| 5.5 Bekor: oldin — to'liq; keyin — chegirma qayta hisoblanadi | `cancelPreview_`, `cancelOrder_` | R (24→6 kun misoli) |
| 5.6 Marja qo'riqchisi: P×(1−D)×(1−K) > tannarx | `marginWarnings_`, `guardMargin_` | A-5 |

Talqinlar: "ishlatilgan kun" = yetkazildi + mijoz aybi bilan kuygan kun (pul qaytmaydi, daromadga kiradi).
Bekorda avval ishlatilgan keshbek, keyin pul qaytariladi; qaytgan pul uchun berilgan keshbek olib qolinadi.

## 6. Mijoz kabineti
8 ekran: ro'yxatdan o'tish (telefon Telegram kontakt orqali, manba, xaritada manzil, rozilik), bosh sahifa
(progress, bugun/ertangi menyu kaloriya bilan, keshbek, "Davom ettirish"), buyurtma berish, chegirmalar,
keshbek (balans, tarix, tugayotgan), buyurtmalarim (kalendar, pauza), manzillarim, profil.
Buyurtma oqimi: to'lov kutilmoqda → karta raqami va summa → chek rasmi (ilova yoki botga) yoki naqd →
admin tasdiqlaydi → faol, yetkazish kunlari yaratiladi → "Buyurtmangiz tasdiqlandi, birinchi yetkazish: sana" (R).
Avtomatik xabarlar: paket tugashiga 2 kun, keshbek tugashiga 7 kun, ertalab "yo'lda", "Yetkazildi" (R).
Telefon bir martalik, o'zgartirish adminga so'rov orqali (R).

## 7. Admin panel
Bugun, Buyurtmalar (filtr, chek, tasdiq/rad, qisman to'lov, mijoz nomidan buyurtma, pauza, bekor),
Mijozlar (qidiruv, profil, keshbek tuzatish izoh bilan), Menyu, Narx va paketlar, Keshbek qoidasi,
Yetkazish (hudud bo'yicha kuryer, eslab qolish), Xarajat va oylik, Dashboard, Foydalanuvchilar, Sozlamalar, Audit.
Mijoz holatlari avtomatik (tungi job): yangi, faol, uxlayotgan (1–14 kun), ketgan (45+ kun). TZ 15–45 kun
oralig'ini belgilamagan — u "sovuyotgan" deb ko'rsatiladi; chegaralar Sozlamada (R).

## 8. Dastavka
Manzil: xaritada nuqta (Leaflet/OSM), matn, mo'ljal, hudud ro'yxatdan; zaxira — botga "Joylashuvni yuborish" (R).
Kesish vaqtida: kuryer avtomatik biriktiriladi, zaxira ro'yxat guruhga, oshxona hisoboti (A-12).
Kuryer ekrani: sana, jami/qoldi, hudud guruhlari, qo'ng'iroq, Yandex/Google xarita, "Yo'ldaman", "Yetkazildi"
(ro'yxat oxiriga tushadi), "Yetkazib bo'lmadi" sabab bilan (A-8, R). Kun oxirida belgilanmaganlar qizil (R).
Kuryer narx/to'lov/boshqa tarixni ko'rmaydi (A-8). Har kuryerning oylik yetkazishlari Oyliklar ekranida.

## 9. Xarajat va oyliklar
Tez kiritish: summa, turkum tugmalari, sana (bugun), izoh, chek. Guruhlar: o'zgaruvchan, doimiy (oy kunlariga
bo'linadi), oylik, sherik taqsimoti (xarajat emas). 5 mln dan katta — ikkinchi sherik tasdiqlaydi; tahrir auditda (R).
Oylik turlari: qat'iy, kunlik × kun, yetkazish × stavka; avans; "To'landi" xarajatga bir marta yoziladi (R).

## 10. Dashboard
Davr: bugun, 7 kun, bu oy, o'tgan oy, o'zboshimcha. Foyda yetkazilgan kunlar bo'yicha.
10.1 barcha ko'rsatkichlar (daromad, xarajat, foyda/zarar, marja, kassa, oldindan olingan, keshbek majburiyati,
o'rtacha kunlik, zararsizlik nuqtasi); 10.2 mijozlar tahlili; 10.3 uchta grafik (reja chizig'i Sozlamada);
10.4 uchta ogohlantirish; 10.5 sheriklar ulushi. Qo'lda hisoblangan haftalik namuna bilan solishtirish — A-10.

## 11. Xavfsizlik
initData HMAC + 24 soat (A-7); rol serverda (A-6, A-8); maxfiy kalitlar Script Properties da; cheklar yopiq Drive
papkasida, faqat API orqali ko'rsatiladi; LockService (A-9); to'lov tasdig'i bir marta (A-4, A-9);
telefon/sana/summa tekshiruvi, telefon takrorlanmaydi, daqiqasiga so'rov chegarasi, webhook maxfiy kalit (R);
audit (muhim amallar belgilanadi) (R); tungi zaxira, 30 kun + oylik arxiv (R); kuryer zaxira ro'yxati (A-12);
rozilik va anonimlashtirish (R).

## 12. Qabul mezonlari
`npm test` — 12 mezonning har biri alohida test (A-1 … A-12). 11-mezon (3 soniya) lokal muhitda mantiq tezligini
tekshiradi; haqiqiy Google Sheets kechikishi `seedTestData` bilan joyida o'lchanadi.
