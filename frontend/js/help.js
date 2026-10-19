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
          '<b>Narx va paketlar</b> — ratsion (nomi, kaloriyasi, tannarxi, kunlik narxi), paketlar (6/12/24 kun va chegirma), keshbek qoidasi. ' + link('pricing', 'Ochish'),
          '<b>Sozlamalar</b> — karta raqami va egasi, aloqa telefoni, hududlar ro\'yxati, kesish vaqti. ' + link('settings', 'Ochish'),
          '<b>Foydalanuvchilar</b> — operator va kuryerlarni qo\'shing. Ularning Telegram ID si kerak: har biri botga <code>/id</code> deb yozsa, bot ID sini aytadi. ' + link('users', 'Ochish'),
          '<b>Menyu va katalog</b> — oylik katalog rasmlarini yuklang (doimiy menyu ratsion ichida yoziladi). ' + link('menu-edit', 'Ochish'),
          'Boshqa Telegram akkauntdan o\'zingiz mijoz bo\'lib sinab ko\'ring: ro\'yxatdan o\'ting, buyurtma bering, chek yuboring, keyin shu yerdan tasdiqlang.'
        ])
    },
    {
      id: 'mijoz', icon: '👀', title: 'Mijoz narx, kaloriya, menyu va katalogni qayerda ko\'radi',
      body: '<p>Mijoz botdagi <b>"Ilova"</b> tugmasini bosadi. Pastki menyuda bo\'limlar bor:</p>' +
        '<table class="tbl small"><thead><tr><th>Mijoz bo\'limi</th><th>Nimani ko\'radi</th><th>Siz qayerda kiritasiz</th></tr></thead><tbody>' +
        '<tr><td>🏠 Bosh sahifa</td><td>Faol paketi, qolgan kunlar, keshbek, <b>menyu</b> va <b>katalog</b> havolasi</td><td>Narx va paketlar (menyu), Menyu va katalog</td></tr>' +
        '<tr><td>🛒 Buyurtma</td><td>Ratsion nomi, <b>kaloriyasi</b>, <b>menyusi</b>; har paket uchun <b>jami narx, kuniga narx, tejash, keshbek</b></td><td>Narx va paketlar</td></tr>' +
        '<tr><td>📚 Katalog (Ko\'proq ichida)</td><td>Siz yuklagan oylik katalog rasmlari</td><td>Menyu va katalog</td></tr>' +
        '<tr><td>🏷 Chegirmalar (Ko\'proq ichida)</td><td>Har ratsion: kaloriya, menyu va barcha paketlar narxi jadvalda</td><td>Narx va paketlar</td></tr>' +
        '<tr><td>💰 Keshbek, 📦 Buyurtmalarim</td><td>Balans, tarix, kunlar kalendari, pauza</td><td>Avtomatik</td></tr>' +
        '</tbody></table>' +
        tip('Narx, kaloriya va menyu bir marta kiritiladi: ' + link('pricing', 'Narx va paketlar') + ' → ratsion. Katalog rasmlari: ' + link('menu-edit', 'Menyu va katalog') + '.')
    },
    {
      id: 'narx', icon: '🏷', title: 'Narx, paket va keshbekni kiritish', p: true,
      body: '<h4>Yangi ratsion</h4>' +
        steps([
          link('pricing', 'Narx va paketlar') + ' → <b>+ Ratsion</b>.',
          '<b>Nomi</b> (masalan "Ozish Express"), <b>Kaloriya</b> (kuniga: bitta son yoki oraliq, masalan <code>900–1000</code>), <b>Menyu / tavsif</b> (mijozga ko\'rinadi).',
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
          '<b>+ Paket / yangi chegirma</b> → <b>Kunlar</b> (6, 12, 24...), <b>Chegirma, %</b>, <b>Qachondan</b>.',
          'Mavjud paket chegirmasini o\'zgartirish: paket qatorida <b>O\'zgartirish</b>. Paketni sotuvdan olish: shu oynada "Shu sanadan sotuvdan olish" belgisini qo\'ying.'
        ]) +
        '<h4>Keshbek qoidasi</h4>' +
        steps([
          '<b>Yangi qoida</b> → <b>Foiz</b> (masalan 3), <b>Amal muddati</b> (masalan 60 kun), <b>bitta buyurtmada keshbek bilan to\'lash chegarasi</b> (masalan 30%), <b>Qachondan</b>.'
        ]) +
        tip('Agar chegirma va keshbekdan keyingi narx tannarxdan past bo\'lsa, qizil <b>"Marja qo\'riqchisi"</b> oynasi chiqadi. Bu zarar degani. Ataylab qilayotgan bo\'lsangiz "Baribir saqlash" ni bosing.')
    },
    {
      id: 'menyu', icon: '🍽', title: 'Menyuni kiritish',
      body: '<h4>Doimiy menyu (bir marta)</h4>' +
        steps([
          link('pricing', 'Narx va paketlar') + ' → ratsion kartasida <b>Tahrirlash</b>.',
          '<b>Menyu / tavsif</b> maydoniga menyuni yozing (har qatorga bitta ovqat vaqti) → <b>Saqlash</b>.'
        ]) +
        '<pre class="help-pre">Nonushta: suli bo\'tqasi, yong\'oq\nTushlik: tovuq ko\'krak, grechka, salat\nKechki: baliq, sabzavotlar</pre>' +
        '<p>Mijoz bu menyuni buyurtma berishda, "Chegirmalar" da va bosh sahifada ko\'radi.</p>' +
        '<h4>Kunlik menyu (ixtiyoriy)</h4>' +
        '<p>Faqat biror kunda menyu boshqacha bo\'lsa: ' + link('menu-edit', 'Menyu va katalog') + ' → kerakli kun yonidagi <b>+</b> → ratsion, taomlar, kaloriya. ' +
        'O\'sha kuni mijoz doimiy menyu o\'rniga shuni ko\'radi.</p>'
    },
    {
      id: 'katalog', icon: '📚', title: 'Oylik katalogni joylash',
      body: steps([
          link('menu-edit', 'Menyu va katalog') + ' ni oching. Eng yuqorida <b>📚 Oylik katalog</b> bloki.',
          '<b>+ Rasm qo\'shish</b> → telefoningizdan katalog rasmlarini tanlang (bir nechtasini birdan tanlash mumkin).',
          'Rasmlar mijozga shu tartibda ko\'rinadi. Tartibni <b>↑</b> bilan o\'zgartirasiz.',
          'Yangi oy katalogi chiqsa: eski rasmlarni <b>✕</b> bilan olib tashlang va yangilarini qo\'shing.'
        ]) +
        tip('Mijoz bosh sahifasida "📚 Oylik katalog" kartasi chiqadi, bosganda katalog ochiladi. Rasmni bossa, kattalashtirib ko\'radi.') +
        tip('JPG yoki PNG rasm yuklang. Katalog PDF bo\'lsa, avval sahifalarini rasm qilib saqlang.')
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
