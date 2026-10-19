/* Admin panel ichidagi yo'riqnoma: tizimni qanday ishlatish (sherik va operator uchun). */
(function () {
  'use strict';
  var A = window.AdminApp = window.AdminApp || {};

  function link(path, label) {
    return '<a href="#/' + path + '">' + label + ' ›</a>';
  }
  function steps(list) {
    return '<ol class="help-steps">' + list.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
  }
  function tip(text) {
    return '<div class="help-tip">💡 ' + text + '</div>';
  }

  // p: true — faqat sheriklarga ko'rinadi
  var SECTIONS = [
    {
      id: 'boshlash', icon: '🚀', title: 'Birinchi kun: nimadan boshlash kerak', p: true,
      body: '<p>Mijozlarni chaqirishdan oldin shu tartibda sozlang. Narx va paket bo\'lmasa, mijoz buyurtma bera olmaydi.</p>' +
        steps([
          '<b>Narx va paketlar</b> — kaloriya variantlari (nomi, kaloriyasi, tannarxi, kunlik narxi), chegirma (masalan "10 kun — 10%"), keshbek qoidasi. ' + link('pricing', 'Ochish'),
          '<b>Sozlamalar</b> — karta raqami va egasi, aloqa telefoni, hududlar ro\'yxati, kesish vaqti. ' + link('settings', 'Ochish'),
          '<b>Foydalanuvchilar</b> — operator va kuryerlarni qo\'shing. Ularning Telegram ID si kerak: har biri botga <code>/id</code> deb yozsa, bot ID sini aytadi. ' + link('users', 'Ochish'),
          '<b>Menyu</b> — 6 kunlik menyu rasmini (katalog) yuklang. ' + link('menu-edit', 'Ochish'),
          'Boshqa Telegram akkauntdan o\'zingiz mijoz bo\'lib sinab ko\'ring: ro\'yxatdan o\'ting, buyurtma bering, chek yuboring, keyin shu yerdan tasdiqlang.'
        ])
    },
    {
      id: 'mijoz', icon: '👀', title: 'Mijoz narx, kaloriya va menyuni qayerda ko\'radi',
      body: '<p>Mijoz botdagi <b>"Ilova"</b> tugmasini bosadi. Bo\'limlar:</p>' +
        '<table class="tbl small"><thead><tr><th>Mijoz bo\'limi</th><th>Nimani ko\'radi</th><th>Siz qayerda kiritasiz</th></tr></thead><tbody>' +
        '<tr><td>🏠 Bosh sahifa</td><td>Faol buyurtma, qolgan kunlar, bugun menyuning nechanchi kuni, tavsiya qilingan variant, keshbek</td><td>Avtomatik</td></tr>' +
        '<tr><td>🍽 Menyu</td><td>Siz yuklagan 6 kunlik menyu rasmi</td><td>' + link('menu-edit', 'Menyu') + '</td></tr>' +
        '<tr><td>💲 Narxlar (Ko\'proq ichida)</td><td>Jadval: variant · kaloriya · kunlik narx, chegirma va keshbek</td><td>' + link('pricing', 'Narx va paketlar') + '</td></tr>' +
        '<tr><td>🛒 Buyurtma</td><td>Variantni tanlaydi, <b>necha kunga</b> ekanini yozadi (1 kundan 1 yilgacha), jami narxni ko\'radi</td><td>Narx va paketlar</td></tr>' +
        '<tr><td>🎯 Kaloriya va vazn (Ko\'proq ichida)</td><td>Bo\'yi, vazni, maqsadi → mos variant tavsiyasi; vazn tarixi</td><td>Mijozning o\'zi kiritadi</td></tr>' +
        '<tr><td>💰 Keshbek, 📦 Buyurtmalarim</td><td>Balans, tarix, kunlar kalendari, pauza</td><td>Avtomatik</td></tr>' +
        '</tbody></table>'
    },
    {
      id: 'narx', icon: '🏷', title: 'Narx, paket va keshbekni kiritish', p: true,
      body: '<h4>Yangi ratsion</h4>' +
        steps([
          link('pricing', 'Narx va paketlar') + ' → <b>+ Ratsion</b>.',
          '<b>Nomi</b> (masalan "Ozish Express"), <b>Kaloriya</b> (kuniga: bitta son yoki oraliq, masalan <code>900–1000</code>), <b>Qisqa tavsif</b> (ixtiyoriy, masalan "Klassik va qulay tanlov").',
          '<b>Ovqat tannarxi</b> va <b>Qadoq va yetkazish tannarxi</b> — bir kunlik xarajatingiz. Mijozga ko\'rinmaydi, faqat zarar bo\'lmasligini tekshirish uchun.',
          '<b>Boshlang\'ich kunlik narx</b> — mijoz to\'laydigan kunlik narx. <b>Saqlash</b>.'
        ]) +
        '<h4>Narxni o\'zgartirish</h4>' +
        steps([
          'Ratsion kartasida <b>Yangi narx</b> → summa va <b>Qachondan</b> sanasini tanlang.',
          'Eski buyurtmalar o\'zgarmaydi. Yangi narx faqat shu sanadan keyingi buyurtmalarga ishlaydi. Eski narxlar "Narx tarixi" da qoladi.'
        ]) +
        '<h4>Paketlar va chegirma</h4>' +
        steps([
          'Mijoz istalgan kunga buyurtma beradi (1 kundan 1 yilgacha). Chegirma "paket" orqali beriladi: <b>+ Paket / yangi chegirma</b> → <b>Kunlar</b> = 10, <b>Chegirma</b> = 10% → 10 kun va undan ko\'p buyurtmaga 10% chegirma.',
          'Bir nechta pog\'ona ham mumkin (masalan 10 kun — 10%, 30 kun — 15%): har buyurtmaga kunlar soniga mos eng katta chegirma qo\'llanadi. Pog\'ona kerak bo\'lmasa, bitta paket yetadi.',
          'Mavjud paket chegirmasini o\'zgartirish: paket qatorida <b>O\'zgartirish</b>. Paketni sotuvdan olish: shu oynada "Shu sanadan sotuvdan olish" belgisini qo\'ying.'
        ]) +
        '<h4>Keshbek qoidasi</h4>' +
        steps([
          '<b>Yangi qoida</b> → <b>Foiz</b> (masalan 3), <b>Amal muddati</b> (masalan 60 kun), <b>bitta buyurtmada keshbek bilan to\'lash chegarasi</b> (masalan 30%), <b>Qachondan</b>.'
        ]) +
        tip('Agar chegirma va keshbekdan keyingi narx tannarxdan past bo\'lsa, qizil <b>"Marja qo\'riqchisi"</b> oynasi chiqadi. Bu zarar degani. Ataylab qilayotgan bo\'lsangiz "Baribir saqlash" ni bosing.')
    },
    {
      id: 'menyu', icon: '🍽', title: 'Menyuni joylash (6 kunlik)',
      body: '<p>Menyu 6 kunlik: <b>dushanba — 1-kun, seshanba — 2-kun ... shanba — 6-kun</b>, yakshanba dam. Hamma variantga bir xil ovqat tayyorlanadi, faqat porsiya (kaloriya) farq qiladi.</p>' +
        steps([
          link('menu-edit', 'Menyu') + ' ni oching → <b>+ Rasm qo\'shish</b> → menyu (katalog) rasmini tanlang. Bir nechta rasm ham bo\'lishi mumkin.',
          'Tartibni <b>↑</b> bilan o\'zgartirasiz.',
          'Menyu o\'zgarganda: eski rasmni <b>✕</b> bilan olib tashlang va yangisini qo\'shing.'
        ]) +
        tip('Mijoz bosh sahifasida "Bugun: 2-kun menyusi" kabi yozuvni ko\'radi va "🍽 Menyu" bo\'limida rasmni ochadi.') +
        tip('JPG yoki PNG rasm yuklang. PDF bo\'lsa, avval sahifalarini rasm qilib saqlang.')
    },
    {
      id: 'kaloriya', icon: '🎯', title: 'Kaloriya tavsiyasi va vazn statistikasi',
      body: '<p>Mijoz ilovada <b>"🎯 Kaloriya va vazn"</b> bo\'limida jinsi, tug\'ilgan yili, bo\'yi, vazni, maqsadi (ozish / saqlash / vazn olish) va turmush tarzini (ofis / o\'rtacha / sport) kiritadi. ' +
        'Ozish yoki vazn olishni tanlasa, <b>usulini</b> ham tanlaydi: <b>yengil</b> (haftasiga ~0,25 kg), <b>o\'rtacha</b> (~0,5 kg), <b>tez</b> (~0,75 kg). ' +
        'Ilova kunlik sarfni hisoblaydi (Mifflin–San Jeor formulasi), usulga qarab kaloriyani kamaytiradi yoki ko\'paytiradi (1 kg ≈ 7700 kkal) va <b>eng yaqin kaloriyali variantni</b> tavsiya qiladi.</p>' +
        '<p><b>📈 Prognoz</b> grafigida 1, 3 va 6 oyda vazn qancha bo\'lishi ko\'rinadi (masalan "3 oyda — 13-yanvargacha ~88 kg"). ' +
        'Ozishda kuniga erkakka 1500, ayolga 1200 kkal dan kam tavsiya qilinmaydi va prognoz me\'yordan (tana massasi indeksi 18,5) pastga tushmaydi.</p>' +
        '<p>Faol buyurtmasi bor mijozdan bot har <b>15 kunda</b> vaznini so\'raydi (muddatni ' + link('settings', 'Sozlamalar') + ' → Buyurtma qoidalari da o\'zgartirasiz). ' +
        'Natijalar: ' + link('weights', 'Vazn statistikasi') + ' va mijoz kartasida.</p>'
    },
    {
      id: 'buyurtma', icon: '📦', title: 'Buyurtma va to\'lovni tasdiqlash',
      body: '<p>Mijoz buyurtma berganda holati <b>"To\'lov kutilmoqda"</b> bo\'ladi. Mijoz kartaga to\'lab chek rasmini yuboradi yoki "Naqd to\'layman" ni tanlaydi. Sizga Telegram\'da xabar keladi.</p>' +
        steps([
          link('', 'Bugun') + ' → <b>Tasdiq kutayotgan to\'lovlar</b> ro\'yxatidan buyurtmani bosing.',
          '<b>🧾 Chek</b> — chek rasmini ko\'rish.',
          '<b>Tasdiqlash</b> — haqiqatda kelgan summani tekshirib tasdiqlang. To\'liq to\'langanda buyurtma <b>Faol</b> bo\'ladi, yetkazish kunlari yaratiladi, mijozga xabar boradi.',
          'Chek noto\'g\'ri bo\'lsa — <b>Rad</b> va sababini yozing (mijozga boradi).',
          'Qisman to\'lov bo\'lsa — summani kiriting. "Qisman bo\'lsa ham faollashtirish" belgisi bilan buyurtmani baribir boshlash mumkin.'
        ]) +
        '<h4>Telefon orqali yozgan mijozga buyurtma</h4>' +
        steps([
          link('orders', 'Buyurtmalar') + ' → <b>+ Buyurtma</b> → mijozni tanlang (yo\'q bo\'lsa <b>+ Yangi mijoz</b>).',
          'Ratsion, paket, sana, manzilni tanlang. Pul olgan bo\'lsangiz "Darhol to\'lov" ga summani yozing.'
        ]) +
        '<h4>Pauza va bekor qilish</h4>' +
        '<p>Buyurtma ichida kunlar kalendari bor: kunni bosib pauza qilasiz (paket oxiri 1 kunga suriladi). <b>Buyurtmani bekor qilish</b> tugmasi avval qancha pul va keshbek qaytishini ko\'rsatadi, keyin tasdiqlaysiz.</p>' +
        tip('To\'lovni ikki marta tasdiqlab yuborsangiz ham keshbek bir marta hisoblanadi — xavotir olmang.')
    },
    {
      id: 'mijozlar', icon: '👥', title: 'Mijozlar bilan ishlash',
      body: '<ul class="help-list">' +
        '<li>' + link('clients', 'Mijozlar') + ' — ism yoki telefon bo\'yicha qidiring, holat va manba bo\'yicha filtrlang.</li>' +
        '<li>Mijoz kartasida: buyurtmalari, manzillari, keshbek tarixi.</li>' +
        '<li><b>Keshbekni qo\'lda tuzatish</b>: summa (+ qo\'shish, − ayirish) va izoh majburiy. Bu Auditga alohida yoziladi.</li>' +
        '<li><b>Telefonni o\'zgartirish so\'rovi</b> kelsa, kartada tasdiqlash/rad etish tugmalari chiqadi.</li>' +
        '<li>Mijoz holatlari o\'zi o\'zgaradi: Yangi → Faol → Uxlayotgan → Ketgan.</li>' +
        '</ul>'
    },
    {
      id: 'yetkazish', icon: '🛵', title: 'Yetkazish, kuryer va oshxona hisoboti',
      body: steps([
          link('delivery', 'Yetkazish') + ' → kunni tanlang (Bugun / Ertaga).',
          'Har bir hudud kartasida kuryerni tanlang va <b>Biriktirish</b> ni bosing. "Keyingi kunlar ham" belgisi tursa, shu hudud keyingi kunlarda ham shu kuryerga avtomatik tushadi.',
          '<b>Oshxona hisoboti</b> tabida ertaga har ratsiondan nechta tayyorlash kerakligi ko\'rinadi.',
          'Kuryer yetkazganini belgilay olmasa, siz shu yerdan <b>Belgilash</b> orqali belgilaysiz.'
        ]) +
        tip('Kun oxirida belgilanmagan yetkazishlar "Bugun" ekranida qizil bo\'lib turadi.') +
        '<p><b>Kuryer nimani ko\'radi:</b> ilovani ochganda faqat o\'ziga biriktirilgan bugungi ro\'yxat — mijoz ismi, telefoni, manzil, mo\'ljal, ratsion. Tugmalar: Xaritada, Yo\'ldaman, Yetkazildi, Bo\'lmadi. Narx va to\'lovni ko\'rmaydi.</p>'
    },
    {
      id: 'xarajat', icon: '🧾', title: 'Xarajat va oyliklar', p: true,
      body: '<h4>Xarajat (15 soniyada)</h4>' +
        steps([
          link('expenses', 'Xarajat') + ' → summani yozing → turkum tugmasini bosing → <b>Saqlash</b>. Sana avtomatik bugun.',
          'Chek rasmi ixtiyoriy (📷 Chek).',
          '5 000 000 so\'mdan katta xarajatni boshqa sherik tasdiqlashi kerak.',
          '"Sherik taqsimoti" — sheriklar o\'ziga olgan pul. U xarajat emas, foydadan alohida hisoblanadi.'
        ]) +
        '<h4>Oyliklar</h4>' +
        steps([
          link('payroll', 'Oyliklar') + ' → <b>+ Xodim</b>: ism, lavozim, oylik turi (qat\'iy / kunlik / yetkazish soni bo\'yicha), stavka.',
          'Avans berilsa — <b>Avans</b>. Oy oxirida — <b>To\'landi</b>: qolgan summa xarajatlarga o\'zi yoziladi.'
        ])
    },
    {
      id: 'dashboard', icon: '📊', title: 'Dashboardni o\'qish', p: true,
      body: '<ul class="help-list">' +
        '<li><b>Daromad</b> yetkazilgan kunlar bo\'yicha hisoblanadi, pul tushgan kun bo\'yicha emas.</li>' +
        '<li><b>Kassa</b> — haqiqatda qancha pul bor: tushgan to\'lovlar minus xarajatlar.</li>' +
        '<li><b>Oldindan olingan</b> — to\'langan, lekin hali yetkazilmagan kunlar (mijozlar oldidagi qarzimiz).</li>' +
        '<li><b>Zararsizlik nuqtasi</b> — zarar qilmaslik uchun kuniga nechta ratsion kerak.</li>' +
        '<li>Xarajat 3 kundan beri kiritilmasa, ogohlantirish chiqadi — foyda noto\'g\'ri ko\'rinishi mumkin.</li>' +
        '</ul>' + link('dashboard', 'Dashboardni ochish')
    },
    {
      id: 'sozlama', icon: '⚙️', title: 'Sozlamalar va foydalanuvchilar', p: true,
      body: '<ul class="help-list">' +
        '<li><b>Kesish vaqti</b> (standart 18:00) — shundan keyin ertangi kunga buyurtma va pauza qabul qilinmaydi.</li>' +
        '<li><b>Dam olish kunlari</b> va <b>bayramlar</b> — bu kunlarda yetkazish bo\'lmaydi, paket kunlari suriladi.</li>' +
        '<li><b>Hududlar</b> — mijoz manzil kiritganda shu ro\'yxatdan tanlaydi.</li>' +
        '<li><b>Kuryerlar guruhi chat ID</b> — har kuni kesish vaqtida ertangi ro\'yxat shu guruhga yuboriladi (ilova ishlamasa ham kuryer ro\'yxatsiz qolmaydi).</li>' +
        '<li>' + link('users', 'Foydalanuvchilar') + ' — operator, kuryer va sheriklarni qo\'shish yoki o\'chirish.</li>' +
        '</ul>'
    },
    {
      id: 'xabarlar', icon: '🔔', title: 'Avtomatik xabarlar (o\'zi ishlaydi)',
      body: '<ul class="help-list">' +
        '<li>To\'lov tasdiqlanganda — mijozga "Buyurtmangiz tasdiqlandi, birinchi yetkazish: sana".</li>' +
        '<li>Har kuni ertalab — "Bugun ovqatingiz yo\'lda". Kuryer "Yetkazildi" bosganda — "Yetkazildi".</li>' +
        '<li>Paket tugashiga 2 kun qolganda — "Davom etasizmi?".</li>' +
        '<li>Keshbek muddati tugashiga 7 kun qolganda — ogohlantirish.</li>' +
        '<li>Har 15 kunda — faol mijozdan bugungi vaznini so\'rash.</li>' +
        '<li>Kesish vaqtida — sizga oshxona hisoboti, kuryerlar guruhiga ertangi ro\'yxat.</li>' +
        '</ul>'
    },
    {
      id: 'savol', icon: '❓', title: 'Ko\'p beriladigan savollar',
      body: '<p><b>Mijoz "buyurtma bera olmayapman" deyapti.</b> Narx va paketlar bo\'limida ratsion "Sotuvda" va narxi bormi, paketlar bormi — tekshiring.</p>' +
        '<p><b>Mijoz to\'lov oynasida karta raqamini ko\'rmayapti.</b> Sozlamalar → To\'lov va aloqa → karta raqamini kiriting.</p>' +
        '<p><b>Kuryer ro\'yxati bo\'sh.</b> Yetkazish bo\'limida shu hududga kuryer biriktirilganmi — tekshiring.</p>' +
        '<p><b>Xato bosib yubordim.</b> Hech narsa butunlay o\'chmaydi. Kim, qachon, nimani o\'zgartirgani Audit bo\'limida turadi.</p>'
    }
  ];

  function helpPage(params, q) {
    var partner = A.me && A.me.rol === 'sherik';
    var list = SECTIONS.filter(function (s) { return partner || !s.p; });
    var open = q.b || '';
    var html = '<h1>📖 Yo\'riqnoma</h1><p class="muted">Bo\'limni bosing — ochiladi.</p>' +
      list.map(function (s) {
        return '<details class="card help-sec" id="h_' + s.id + '"' + (open === s.id ? ' open' : '') + '>' +
          '<summary><span class="help-ico">' + s.icon + '</span>' + UI.esc(s.title) + '</summary>' +
          '<div class="help-body">' + s.body + '</div></details>';
      }).join('');
    UI.view(html);
    if (open) {
      var el = document.getElementById('h_' + open);
      if (el) el.scrollIntoView();
    }
  }

  A.helpRoute = function () {
    UI.route('help', helpPage);
  };
})();
