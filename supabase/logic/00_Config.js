/**
 * Soglom Ovqatlar — server konfiguratsiyasi.
 *
 * Baza: Google Sheets. Har bir varaq = bitta jadval (TZ 4-bo'lim).
 * Ustun turlari: s = matn, n = butun son (so'm, kun), f = kasr son (foiz),
 * g = bo'sh bo'lishi mumkin bo'lgan son (lat/lng), b = ha/yo'q, j = JSON, d = sana (YYYY-MM-DD), t = vaqt (ISO).
 * Hammasi Sheetsga matn ko'rinishida yoziladi (ustun formati "@"), shuning uchun
 * Sheets sanani o'zicha o'zgartirib yubormaydi.
 */

var APP_NAME = "Sog'lom Ovqatlar";
var TZ = 'Asia/Tashkent';

var ROLES = {
  CLIENT: 'mijoz',
  PARTNER: 'sherik',
  OPERATOR: 'operator',
  COURIER: 'kuryer'
};

var SCHEMA = {
  Foydalanuvchilar: [
    ['id', 's'], ['tg_id', 's'], ['rol', 's'], ['ism', 's'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Mijozlar: [
    ['id', 's'], ['tg_id', 's'], ['ism', 's'], ['telefon', 's'], ['manba', 's'],
    ['royxatdan_sana', 'd'], ['holat', 's'], ['izoh', 's'], ['til', 's'],
    ['rozilik_vaqt', 't'], ['telefon_sorov', 's'], ['kim_yaratdi', 's'], ['faol', 'b']
  ],
  Manzillar: [
    ['id', 's'], ['mijoz_id', 's'], ['nom', 's'], ['lat', 'g'], ['lng', 'g'], ['matn', 's'],
    ['moljal', 's'], ['hudud', 's'], ['faol', 'b']
  ],
  Ratsionlar: [
    ['id', 's'], ['nom', 's'], ['kaloriya', 's'], ['tavsif', 's'],
    ['tannarx_ovqat', 'n'], ['tannarx_qadoq_yetkazish', 'n'], ['faol', 'b']
  ],
  Narxlar: [
    ['id', 's'], ['ratsion_id', 's'], ['kunlik_narx', 'n'], ['qachondan', 'd'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Paketlar: [
    ['id', 's'], ['nom', 's'], ['kunlar', 'n'], ['chegirma_foiz', 'f'], ['qachondan', 'd'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  KeshbekQoida: [
    ['id', 's'], ['foiz', 'f'], ['amal_muddati_kun', 'n'], ['min_summa', 'n'],
    ['max_ulush_foiz', 'f'], ['qachondan', 'd'], ['yaratilgan', 't']
  ],
  Buyurtmalar: [
    ['id', 's'], ['mijoz_id', 's'], ['manzil_id', 's'], ['ratsion_id', 's'], ['paket_id', 's'],
    ['kunlar', 'n'], ['boshlanish', 'd'], ['tugash', 'd'],
    ['kunlik_narx', 'n'], ['chegirma_foiz', 'f'], ['keshbek_foiz', 'f'], ['keshbek_muddat_kun', 'n'],
    ['keshbek_ishlatildi', 'n'], ['jami', 'n'], ['tolanadi', 'n'], ['kunlik_daromad', 'f'],
    ['tolov_holati', 's'], ['holat', 's'], ['kim_yaratdi', 's'], ['yaratuvchi_id', 's'],
    ['yaratilgan', 't'], ['narx_muddati', 't'], ['tolov_usuli', 's'], ['izoh', 's'],
    ['qaytarilgan', 'n'], ['eslatma_yuborildi', 'b']
  ],
  Yetkazishlar: [
    ['id', 's'], ['buyurtma_id', 's'], ['mijoz_id', 's'], ['sana', 'd'], ['holat', 's'], ['sabab', 's'],
    ['kuryer_id', 's'], ['hudud', 's'], ['ratsion_id', 's'], ['izoh', 's'], ['vaqt', 't'], ['yoldaman_vaqt', 't']
  ],
  Tolovlar: [
    ['id', 's'], ['buyurtma_id', 's'], ['summa', 'n'], ['usul', 's'], ['sana', 'd'],
    ['holat', 's'], ['tasdiqlagan', 's'], ['chek_rasm', 's'], ['izoh', 's'], ['yaratilgan', 't']
  ],
  KeshbekHarakat: [
    ['id', 's'], ['mijoz_id', 's'], ['buyurtma_id', 's'], ['tur', 's'], ['summa', 'n'],
    ['sana', 'd'], ['tugash_sana', 'd'], ['manba_id', 's'], ['izoh', 's'], ['kim', 's']
  ],
  XarajatTurkum: [
    ['id', 's'], ['nom', 's'], ['guruh', 's'], ['kod', 's'], ['hissa', 'b'], ['faol', 'b']
  ],
  Xarajatlar: [
    ['id', 's'], ['sana', 'd'], ['turkum_id', 's'], ['summa', 'n'], ['izoh', 's'], ['chek_rasm', 's'],
    ['kim_kiritdi', 's'], ['davr_oy', 's'], ['manba', 's'], ['sherik_id', 's'], ['oylik_id', 's'],
    ['holat', 's'], ['tasdiqlagan', 's'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Xodimlar: [
    ['id', 's'], ['ism', 's'], ['lavozim', 's'], ['oylik_turi', 's'], ['summa', 'n'],
    ['tg_id', 's'], ['faol', 'b']
  ],
  Oyliklar: [
    ['id', 's'], ['xodim_id', 's'], ['oy', 's'], ['hisoblangan', 'n'], ['avans', 'n'], ['tolangan', 'n'],
    ['ishlagan_kun', 'n'], ['yetkazish_soni', 'n'], ['sana', 'd']
  ],
  Menyu: [
    ['id', 's'], ['sana', 'd'], ['ratsion_id', 's'], ['taomlar', 's'], ['kaloriya', 'n'], ['faol', 'b']
  ],
  Audit: [
    ['id', 's'], ['vaqt', 't'], ['kim', 's'], ['amal', 's'], ['varaq', 's'], ['yozuv_id', 's'],
    ['eski', 's'], ['yangi', 's'], ['muhim', 's']
  ],
  Sozlama: [
    ['kalit', 's'], ['qiymat', 's']
  ]
};

/** Sozlamalar standart qiymatlari (TZ 5, 7, 8, 9, 10, 13-bo'limlardagi misollar). */
var DEFAULT_SETTINGS = {
  kesish_vaqti: '18:00',
  dam_kunlari: '0',                      // 0 = yakshanba (JS getDay), vergul bilan
  bayramlar: '[]',                       // ["2026-01-01", ...]
  pauza_foiz: '20',
  narx_kafolat_soat: '48',
  hududlar: '["Chilonzor","Yunusobod","Mirzo Ulug\'bek","Yakkasaroy","Sergeli"]',
  kuryer_hudud: '{}',                    // {"Chilonzor": "<foydalanuvchi_id>"}
  mijoz_uxlash_kun: '14',
  mijoz_ketgan_kun: '45',
  katta_xarajat: '5000000',
  max_summa: '200000000',                // har qanday bitta summa uchun yuqori chegara (validatsiya)
  min_marja_foiz: '15',
  sherik_ulushlari: '[{"ism":"Sherik 1","foiz":25},{"ism":"Sherik 2","foiz":35},{"ism":"Sherik 3","foiz":40}]',
  bizning_xato_qoida: 'keyinga',          // keyinga | keshbek
  karta_raqami: '',
  karta_egasi: '',
  aloqa_telefon: '',
  yetkazish_vaqti: '08:00-13:00',
  ertalabki_xabar_vaqti: '08:00',
  kun_oxiri_vaqti: '21:00',
  eslatma_vaqti: '10:00',
  kuryer_guruh_chat_id: '',
  ishga_tushish_sana: '',
  reja: '[[0,0],[30,6],[60,10],[90,15]]', // [kun, ratsion/kun] — 10.3 reja chizig'i
  rate_limit_daqiqa: '60',
  paket_eslatma_kun: '2',
  keshbek_eslatma_kun: '7',
  backup_papka_id: '',
  arxiv_papka_id: '',
  chek_papka_id: '',
  katalog: '[]',                         // oylik katalog rasmlari: [{"yol":"...","nom":"..."}]
  rozilik_matni: "Ro'yxatdan o'tish orqali ism, telefon raqami va manzilingiz buyurtmani yetkazish va xizmat ko'rsatish uchun qayta ishlanishiga rozilik bildirasiz. Istalgan vaqtda ma'lumotlaringizni o'chirishni so'rashingiz mumkin."
};

/** Mijozni qayerdan topgani (manba). */
var SOURCES = ['Instagram', 'Blogger', 'Tavsiya', 'Telegram', 'Boshqa'];

/** Yetkazib bo'lmadi sabablari (8.3). mijoz_aybi = kun kuyadi, bizning_xato = kun kuymaydi. */
var FAIL_REASONS = {
  javob_bermadi: { nom: 'Mijoz javob bermadi', ayb: 'mijoz' },
  manzil_topilmadi: { nom: 'Manzil topilmadi', ayb: 'mijoz' },
  rad_etdi: { nom: 'Mijoz rad etdi', ayb: 'mijoz' },
  kech_qoldi: { nom: 'Bizning xato: kech qoldi', ayb: 'biz' },
  notogri_ovqat: { nom: "Bizning xato: noto'g'ri ovqat", ayb: 'biz' }
};

/** Boshlang'ich xarajat turkumlari (9.1). */
var DEFAULT_CATEGORIES = [
  ['Bozorlik', 'ozgaruvchan', 'bozorlik', true],
  ['Qadoq va idish', 'ozgaruvchan', 'qadoq', true],
  ["Yetkazish yoqilg'isi / taksi", 'ozgaruvchan', 'yetkazish', true],
  ['Reklama', 'ozgaruvchan', 'reklama', false],
  ["Boshqa o'zgaruvchan", 'ozgaruvchan', '', false],
  ['Ijara', 'doimiy', 'ijara', false],
  ['Elektr', 'doimiy', '', false],
  ['Internet', 'doimiy', '', false],
  ["Boshqa oylik to'lovlar", 'doimiy', '', false],
  ['Oylik', 'oylik', 'oylik', false],
  ['Sherik taqsimoti', 'sherik', 'sherik', false]
];

var EXPENSE_GROUPS = {
  ozgaruvchan: "O'zgaruvchan",
  doimiy: 'Doimiy',
  oylik: 'Oylik',
  sherik: 'Sherik taqsimoti'
};
