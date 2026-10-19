/* Mijoz kabineti (TZ 6-bo'lim): ro'yxatdan o'tish, bosh sahifa, buyurtma, chegirmalar, keshbek, buyurtmalar, manzillar, profil. */
(function () {
  'use strict';
  var esc = UI.esc, som = UI.som, api = UI.api;

  // ---------- 1. Ro'yxatdan o'tish ----------
  function registration(me) {
    var r = me.royxat || {};
    var phone = r.telefon || '';
    var pollTimer = null;
    var html =
      '<div class="hero"><div class="hero-ico">🥗</div><h1>Xush kelibsiz!</h1><p class="muted">3 qadamda ro\'yxatdan o\'ting va birinchi buyurtmangizni bering</p></div>' +
      '<div class="card"><h3><span class="step">1</span> Telefon raqam</h3><div id="phoneBox"></div></div>' +
      '<div class="card"><h3><span class="step">2</span> Siz haqingizda</h3>' +
      UI.field('Ismingiz', '<input id="regName" maxlength="80" value="' + esc(me.ism || '') + '" placeholder="Ism">') +
      '<div class="field"><span class="field-label">Bizni qayerdan topdingiz?</span><div class="chips" id="srcChips">' +
      (r.manbalar || []).map(function (s, i) {
        return '<label class="chip"><input type="radio" name="manba" value="' + esc(s) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
      }).join('') + '</div></div></div>' +
      '<div class="card"><h3><span class="step">3</span> Yetkazish manzili</h3><div id="addrBox"></div>' +
      '<label class="consent"><input type="checkbox" id="regConsent"> <span>' + esc(r.rozilik_matni || '') + '</span></label></div>';
    UI.view(html);
    document.body.classList.remove('has-nav');

    var renderPhone = function () {
      var box = document.getElementById('phoneBox');
      if (phone) {
        box.innerHTML = '<div class="ok-line">✅ ' + esc(phone) + '</div>';
        return;
      }
      UI.mount(box, '<p class="muted small">Raqam Telegram orqali olinadi — qo\'lda yozilmaydi.</p>' +
        '<button class="btn block" data-click="share">📱 Raqamni ulashish</button>' +
        '<p class="hint">Agar tugma ishlamasa: bot chatida pastdagi "📱 Raqamni yuborish" tugmasini bosing, keyin bu yerga qayting.</p>', {
        share: function () {
          var tg = UI.tg;
          if (tg && tg.requestContact) {
            tg.requestContact(function (ok) { if (ok) poll(30); else UI.toast('Raqam ulashilmadi', 'err'); });
          } else {
            UI.toast('Bot chatida "📱 Raqamni yuborish" tugmasini bosing');
            poll(60);
          }
        }
      });
    };
    var poll = function (times) {
      clearTimeout(pollTimer);
      api('contactStatus', {}, { silent: true }).then(function (res) {
        if (res.telefon) { phone = res.telefon; renderPhone(); UI.haptic('success'); return; }
        if (times > 0) pollTimer = setTimeout(function () { poll(times - 1); }, 2000);
      }).catch(function () { if (times > 0) pollTimer = setTimeout(function () { poll(times - 1); }, 3000); });
    };
    renderPhone();
    if (!phone) poll(5);

    AddrForm.form(document.getElementById('addrBox'), {
      addr: { nom: 'Uy' }, hududlar: r.hududlar, submitLabel: 'Ro\'yxatdan o\'tish', telegramLocation: true,
      onSubmit: function (addr) {
        if (!phone) { UI.toast('Avval telefon raqamni ulashing', 'err'); return; }
        var src = document.querySelector('input[name=manba]:checked');
        if (!document.getElementById('regConsent').checked) { UI.toast('Rozilik belgisini qo\'ying', 'err'); return; }
        return api('register', {
          ism: document.getElementById('regName').value, manba: src ? src.value : 'Boshqa',
          rozilik: true, manzil: addr
        }).then(function () {
          UI.haptic('success');
          clearTimeout(pollTimer);
          location.hash = '#/health?yangi=1';
          location.reload();
        });
      }
    });
  }

  // ---------- 2. Bosh sahifa ----------
  var DAY_NAMES = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  function menuDayText(n) { return n ? n + '-kun menyusi' : 'dam olish kuni'; }

  function home() {
    return api('home').then(function (d) {
      var p = d.faol_paket;
      var html = '<h1>Salom, ' + esc(d.ism) + '!</h1>';
      d.tolov_kutilmoqda.forEach(function (o) {
        html += '<a class="card warn link" href="#/pay/' + esc(o.id) + '"><div class="row between"><b>💳 To\'lov kutilmoqda</b><span>›</span></div>' +
          '<div>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun — <b>' + som(o.tolanadi - o.tolangan) + '</b></div>' +
          '<div class="small muted">' + (o.chek_yuborilgan ? 'Chek yuborildi, admin tasdiqlashi kutilmoqda' : 'To\'lab, chek rasmini yuboring') + '</div></a>';
      });
      if (p) {
        html += '<div class="card"><div class="row between"><h3>' + esc(p.ratsion) + '</h3>' + UI.statusBadge('faol', 'Faol') + '</div>' +
          '<div class="big">' + p.qolgan_kun + ' <span class="muted small">/ ' + p.kunlar + ' kun qoldi</span></div>' + UI.progress(p.foiz) +
          '<div class="row between small muted mt"><span>' + UI.date(p.boshlanish) + '</span><span>' + UI.date(p.tugash) + '</span></div>' +
          (p.ertaga ? '<div class="small mt">Ertaga: ' + UI.statusBadge(p.ertaga.holat, p.ertaga.holat_nomi) + '</div>' : '') +
          '<div class="row gap mt"><a class="btn ghost grow" href="#/orders/' + esc(p.id) + '">Kunlar va pauza</a>' +
          '<a class="btn grow" href="#/order">Davom ettirish</a></div></div>';
      } else if (!d.tolov_kutilmoqda.length) {
        html += '<div class="card accent"><h3>Faol buyurtmangiz yo\'q</h3><p>O\'zingizga mos kaloriyani tanlang va istalgan kunga buyurtma bering (1 kundan 1 yilgacha).</p>' +
          '<a class="btn block" href="#/order">🛒 Buyurtma berish</a></div>';
      }
      var h = d.salomatlik || {};
      if (h.sorash_kerak) {
        html += '<a class="card warn link" href="#/health"><div class="row between"><b>⚖️ Vazningizni kiriting</b><span>›</span></div>' +
          '<div class="small">Natijangizni kuzatib borish uchun bugungi vazningizni yozing</div></a>';
      }
      if (!h.toliq) {
        html += '<a class="card link accent" href="#/health"><div class="row between"><div><b>🎯 Sizga qaysi kaloriya mos?</b>' +
          '<div class="small muted">Bo\'yingiz, vazningiz va maqsadingizni kiriting — mos variantni tavsiya qilamiz</div></div><span>›</span></div></a>';
      } else if (h.tavsiya) {
        html += '<a class="card link" href="#/health"><div class="row between"><div><div class="muted small">Sizga tavsiya</div><b>' + esc(h.tavsiya.ratsion) + '</b>' +
          (h.tavsiya.kaloriya ? ' · ' + esc(h.tavsiya.kaloriya) + ' kkal' : '') +
          (h.statistika && h.statistika.ozgarish ? '<div class="small ' + (h.statistika.ozgarish < 0 ? 'save' : '') + '">Vazn: ' +
            (h.statistika.ozgarish > 0 ? '+' : '') + h.statistika.ozgarish + ' kg (' + h.statistika.joriy + ' kg)</div>' : '') +
          '</div><span class="big-ico">🎯</span></div></a>';
      }
      var mk = d.menyu_kuni || {};
      html += '<a class="card link" href="#/catalog"><div class="row between"><div><b>🍽 Menyu</b>' +
        '<div class="small muted">Bugun: ' + menuDayText(mk.bugun) + ' · Ertaga: ' + menuDayText(mk.ertaga) + '</div></div><span>›</span></div></a>';
      html += '<a class="card link" href="#/discounts"><div class="row between"><b>💲 Narxlar</b><span>›</span></div>' +
        '<div class="small muted">Kaloriya variantlari va kunlik narxlar</div></a>';
      html += '<a class="card link" href="#/cashback"><div class="row between"><div><div class="muted small">Keshbek balansi</div><div class="big">' +
        som(d.keshbek) + '</div></div><span class="big-ico">💰</span></div></a>';
      if (d.aloqa) html += '<p class="center small muted">Savollar: <a href="tel:' + esc(d.aloqa) + '">' + esc(d.aloqa) + '</a> · Yetkazish ' + esc(d.yetkazish_vaqti) + '</p>';
      UI.view(html);
    });
  }

  // ---------- 3. Buyurtma berish ----------
  var QUICK_DAYS = [1, 6, 10, 24, 30, 312];
  function daysLabel(n) { return n === 312 ? '1 yil' : n + ' kun'; }
  function discountRules(paketlar) {
    return paketlar.filter(function (p) { return p.chegirma_foiz > 0; }).map(function (p) {
      return p.kunlar + ' kun va undan ko\'p — ' + p.chegirma_foiz + '% chegirma';
    });
  }

  function orderPage(params, query) {
    return Promise.all([api('orderForm'), api('health', {}, { silent: true }).catch(function () { return null; })]).then(function (res) {
      var f = res[0], hv = res[1];
      var rations = f.katalog.ratsionlar;
      if (!rations.length) { UI.view(UI.empty('🍽', 'Hozircha sotuvda ratsion yo\'q')); return; }
      var recId = hv && hv.tavsiya ? hv.tavsiya.ratsion_id : '';
      var st = {
        ratsion_id: query.ratsion || recId || rations[0].id,
        kunlar: Number(query.kun) || 10,
        boshlanish: f.eng_erta,
        manzil_id: f.manzillar.length ? f.manzillar[0].id : '',
        use_cashback: false
      };
      if (!rations.some(function (r) { return r.id === st.ratsion_id; })) st.ratsion_id = rations[0].id;
      var maxDays = f.katalog.max_kunlar || 320;
      var rules = discountRules(f.katalog.paketlar);
      var quick = QUICK_DAYS.concat(f.katalog.paketlar.map(function (p) { return p.kunlar; }))
        .filter(function (n, i, a) { return n <= maxDays && a.indexOf(n) === i; }).sort(function (x, y) { return x - y; });
      var workDays = f.kalendar.filter(function (d) { return d.ish_kuni; }).slice(0, 14);

      var render = function () {
        var html = '<h1>Buyurtma berish</h1>' +
          '<h3 class="sec">1. Kaloriya varianti</h3><div class="list">' + rations.map(function (x) {
            return '<label class="list-item"><input type="radio" name="rat" value="' + esc(x.id) + '" data-change="ration"' + (x.id === st.ratsion_id ? ' checked' : '') + '>' +
              '<div class="grow"><b>' + esc(x.nom) + '</b>' + (x.id === recId ? ' <span class="badge st-faol">Sizga tavsiya</span>' : '') +
              '<div class="small muted">' + (x.kaloriya ? esc(x.kaloriya) + ' kkal' : '') + (x.tavsif ? ' · ' + esc(x.tavsif) : '') + '</div></div>' +
              '<b class="nowrap">' + UI.money(x.kunlik_narx) + '</b></label>';
          }).join('') + '</div>' +
          (recId ? '' : '<a class="small" href="#/health">🎯 Qaysi biri menga mos? Bilib olish</a>') +
          '<h3 class="sec">2. Necha kunga?</h3><div class="chips">' + quick.map(function (n) {
            return '<button class="chip-btn ' + (n === st.kunlar ? 'on' : '') + '" data-click="days" data-id="' + n + '">' + daysLabel(n) + '</button>';
          }).join('') + '</div>' +
          '<div class="row gap mt"><input type="number" inputmode="numeric" min="1" max="' + maxDays + '" id="daysInput" class="days-input" value="' + st.kunlar + '" data-change="daysInput">' +
          '<span class="muted">ish kuni</span></div>' +
          '<p class="hint">Yakshanba dam olish kuni — kunlar faqat yetkazish kunlari hisoblanadi.' + (rules.length ? ' ' + esc(rules.join('; ')) + '.' : '') + '</p>' +
          '<h3 class="sec">3. Boshlanish sanasi</h3><div class="chips scroll">' + workDays.map(function (d) {
            return '<button class="chip-btn date ' + (d.sana === st.boshlanish ? 'on' : '') + '" data-click="date" data-id="' + d.sana + '">' +
              '<span class="small">' + UI.wd(d.sana) + '</span><br>' + UI.dateShort(d.sana) + '</button>';
          }).join('') + '</div><p class="hint">Kesish vaqti ' + esc(f.kesish_vaqti) + ': undan keyin ertangi kunga buyurtma qabul qilinmaydi.</p>' +
          '<h3 class="sec">4. Manzil</h3><div class="list">' + f.manzillar.map(function (a) {
            return '<label class="list-item"><input type="radio" name="addr" value="' + esc(a.id) + '" data-change="addr"' + (a.id === st.manzil_id ? ' checked' : '') + '>' +
              '<div class="grow"><b>' + esc(a.nom) + '</b> · <span class="muted">' + esc(a.hudud) + '</span><div class="small">' + esc(a.matn) + '</div></div></label>';
          }).join('') + '</div><button class="btn ghost small mt" data-click="newAddr">+ Yangi manzil</button>' +
          (f.keshbek_balans > 0 ? '<h3 class="sec">5. Keshbek</h3><label class="switch-row"><span>Keshbekdan ishlatish <span class="muted">(balans ' + som(f.keshbek_balans) + ')</span></span>' +
            '<input type="checkbox" class="switch" data-change="cb"' + (st.use_cashback ? ' checked' : '') + '></label>' : '') +
          '<div class="summary" id="summary"><div class="spinner small"></div></div>' +
          '<button class="btn block big-btn" data-click="submit" id="submitBtn">Buyurtma berish</button>';
        UI.view(html, actions);
        quote();
      };
      var lastQ = 0;
      var quote = function () {
        var my = ++lastQ;
        var box = document.getElementById('summary');
        return api('quote', st, { silent: true }).then(function (q) {
          if (my !== lastQ || !box) return;
          box.innerHTML =
            '<div class="row between"><span>' + q.kunlar + ' kun × ' + UI.money(q.kunlik_narx) + '</span><span>' + UI.money(q.bez_chegirma) + '</span></div>' +
            (q.tejaladi ? '<div class="row between save"><span>Chegirma ' + q.chegirma_foiz + '%</span><span>−' + UI.money(q.tejaladi) + '</span></div>' : '') +
            (q.keshbek_ishlatildi ? '<div class="row between save"><span>Keshbekdan</span><span>−' + UI.money(q.keshbek_ishlatildi) + '</span></div>' : '') +
            '<div class="row between total"><span>To\'lanadi</span><span>' + som(q.tolanadi) + '</span></div>' +
            '<div class="small muted">' + UI.date(q.boshlanish) + ' — ' + UI.date(q.tugash) + (q.yangi_keshbek ? ' · To\'lovdan keyin +' + UI.money(q.yangi_keshbek) + ' keshbek' : '') + '</div>';
        }).catch(function (e) { if (box) box.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
      };
      var actions = {
        ration: function (el) { st.ratsion_id = el.value; quote(); },
        days: function (el) { st.kunlar = Number(el.dataset.id); render(); },
        daysInput: function (el) {
          var n = Math.round(Number(el.value));
          if (!n || n < 1) n = 1;
          if (n > maxDays) n = maxDays;
          st.kunlar = n;
          render();
        },
        date: function (el) { st.boshlanish = el.dataset.id; render(); },
        addr: function (el) { st.manzil_id = el.value; },
        cb: function (el) { st.use_cashback = el.checked; quote(); },
        newAddr: function () {
          var s = UI.sheet('Yangi manzil', '<div id="naddr"></div>', {}, { wide: true });
          AddrForm.form(s.el.querySelector('#naddr'), {
            addr: { nom: '' }, hududlar: f.hududlar, telegramLocation: true,
            onSubmit: function (d) {
              return api('addressSave', d).then(function (res) {
                f.manzillar = res.items;
                st.manzil_id = res.items[res.items.length - 1].id;
                s.close();
                render();
              });
            }
          });
        },
        submit: function (el) {
          if (!st.manzil_id) return UI.toast('Manzilni tanlang yoki qo\'shing', 'err');
          el.disabled = true;
          return api('createOrder', st).then(function (o) {
            UI.haptic('success');
            UI.go(o.holat === 'faol' ? 'orders/' + o.id : 'pay/' + o.id);
          }).finally(function () { el.disabled = false; });
        }
      };
      render();
    });
  }

  // ---------- To'lov ----------
  function payPage(params) {
    return Promise.all([api('orderDetail', { id: params.id }), api('home')]).then(function (res) {
      var o = res[0], h = res[1];
      if (o.holat !== 'tolov_kutish') { UI.go('orders/' + o.id); return; }
      var pending = o.tolovlar.filter(function (p) { return p.holat === 'kutilmoqda'; });
      var due = o.tolanadi - o.tolangan;
      var html = '<h1>To\'lov</h1><div class="card center"><div class="muted">To\'lanadigan summa</div><div class="huge">' + som(due) + '</div>' +
        '<div class="small muted">' + esc(o.ratsion) + ', ' + o.kunlar + ' kun · narx ' + UI.dt(o.narx_muddati) + ' gacha kafolatlangan</div></div>';
      if (pending.length) {
        html += '<div class="card ok"><b>🧾 ' + (pending[0].usul === 'naqd' ? 'Naqd to\'lov qayd etildi' : 'Chek yuborildi') + '</b>' +
          '<p>Admin tasdiqlagach buyurtma faol bo\'ladi va Telegram orqali xabar olasiz.</p></div>';
      } else {
        html += '<div class="card"><h3>1. Kartaga o\'tkazing</h3>' +
          (h.karta.raqam ? '<div class="cardnum" data-click="copy">' + esc(h.karta.raqam) + ' <span class="small">📋</span></div><div class="muted small">' + esc(h.karta.egasi) + '</div>' :
            '<p class="muted">Karta raqami hali kiritilmagan. Admin bilan bog\'laning.</p>') +
          '<h3 class="mt">2. Chek rasmini yuboring</h3>' +
          '<label class="btn block upload">📷 Chek rasmini tanlash<input type="file" accept="image/*" data-change="receipt" hidden></label>' +
          '<p class="hint">Yoki chek rasmini bot chatiga yuboring.</p></div>' +
          '<button class="btn ghost block" data-click="cash">💵 Naqd to\'layman</button>';
        rejected(o).forEach(function (p) {
          html += '<div class="card warn small">Oldingi chek rad etildi: ' + esc(p.izoh) + '</div>';
        });
      }
      html += '<button class="btn link-btn block mt" data-click="cancel">Buyurtmani bekor qilish</button>';
      UI.view(html, {
        copy: function () { UI.copyText(h.karta.raqam.replace(/\s/g, '')); },
        receipt: function (el) {
          var file = el.files && el.files[0];
          if (!file) return;
          return UI.compressImage(file).then(function (data) {
            return api('submitPayment', { buyurtma_id: o.id, usul: 'karta', chek: data });
          }).then(function () { UI.toast('Chek yuborildi'); UI.haptic('success'); UI.reload(); });
        },
        cash: function () {
          return UI.confirm('Naqd pulni kuryerga emas, ofisga yoki adminga topshirasiz. Davom etamizmi?', 'Ha, naqd').then(function (y) {
            if (!y) return;
            return api('submitPayment', { buyurtma_id: o.id, usul: 'naqd' }).then(function () { UI.reload(); });
          });
        },
        cancel: function () {
          return UI.confirm('Buyurtmani bekor qilasizmi?', 'Bekor qilish', true).then(function (y) {
            if (!y) return;
            return api('cancelMyOrder', { buyurtma_id: o.id }).then(function () { UI.toast('Bekor qilindi'); UI.go(''); });
          });
        }
      });
    });
  }
  function rejected(o) { return o.tolovlar.filter(function (p) { return p.holat === 'rad_etildi'; }).slice(-1); }

  // ---------- 4. Narxlar ----------
  function discounts() {
    return Promise.all([api('discounts'), api('health', {}, { silent: true }).catch(function () { return null; })]).then(function (res) {
      var c = res[0], hv = res[1];
      var recId = hv && hv.tavsiya ? hv.tavsiya.ratsion_id : '';
      var rules = discountRules(c.paketlar);
      if (!c.ratsionlar.length) return UI.view('<h1>💲 Narxlar</h1>' + UI.empty('💲', 'Narxlar hali kiritilmagan. Tez orada qo\'shiladi.'));
      var html = '<h1>💲 Narxlar</h1><p class="muted">Hamma variantda menyu bir xil — farqi faqat porsiya (kaloriya) miqdorida. Variantni bosib buyurtma bering.</p>' +
        '<div class="price-table">' +
        '<div class="price-row head"><span>Variant</span><span>Kkal</span><span>Kunlik narx</span></div>' +
        c.ratsionlar.map(function (r) {
          return '<a class="price-row' + (r.id === recId ? ' rec' : '') + '" href="#/order?ratsion=' + esc(r.id) + '">' +
            '<span><b>' + esc(r.nom) + '</b>' + (r.id === recId ? '<br><span class="badge st-faol">Sizga tavsiya</span>' : '') +
            (r.tavsif ? '<br><span class="small muted">' + esc(r.tavsif) + '</span>' : '') + '</span>' +
            '<span class="nowrap">' + (r.kaloriya ? esc(r.kaloriya) : '—') + '</span>' +
            '<span class="price-val">' + UI.money(r.kunlik_narx) + '</span></a>';
        }).join('') + '</div>' +
        (rules.length ? '<div class="card accent mt">' + rules.map(function (t) { return '<div>🎁 <b>' + esc(t) + '</b></div>'; }).join('') + '</div>' : '') +
        (c.keshbek.foiz ? '<div class="card mt">💰 Har bir to\'lovdan <b>' + c.keshbek.foiz + '% keshbek</b> — keyingi buyurtmada ishlatasiz (' +
          c.keshbek.amal_muddati_kun + ' kun amal qiladi).</div>' : '') +
        (recId ? '' : '<a class="btn ghost block mt" href="#/health">🎯 Qaysi variant menga mos?</a>') +
        '<a class="btn block mt" href="#/order">🛒 Buyurtma berish</a>';
      UI.view(html);
    });
  }

  // ---------- 5. Keshbek ----------
  function cashback() {
    return api('cashback').then(function (c) {
      var html = '<h1>Keshbek</h1><div class="card center"><div class="muted">Balans</div><div class="huge">' + som(c.balans) + '</div>' +
        (c.keyingi_tugash ? '<div class="small muted">' + som(c.keyingi_tugash.summa) + ' — ' + UI.date(c.keyingi_tugash.tugash_sana) + ' gacha amal qiladi</div>' : '') + '</div>';
      if (c.tugayotgan.length) {
        html += '<div class="card warn"><b>⏳ Muddati tugayapti</b>' + c.tugayotgan.map(function (t) {
          return '<div>' + som(t.summa) + ' — ' + UI.date(t.tugash_sana) + '</div>';
        }).join('') + '<a class="btn block mt" href="#/order">Buyurtmada ishlatish</a></div>';
      }
      html += '<h3 class="sec">Tarix</h3>' + (c.tarix.length ? '<div class="list">' + c.tarix.map(function (e) {
        return '<div class="list-item"><div class="grow"><b>' + esc(e.tur_nomi) + '</b><div class="small muted">' + UI.date(e.sana) +
          (e.tugash_sana && e.summa > 0 ? ' · ' + UI.date(e.tugash_sana) + ' gacha' : '') + (e.izoh && e.tur === 'tuzatish' ? ' · ' + esc(e.izoh) : '') + '</div></div>' +
          '<b class="' + (e.summa > 0 ? 'save' : 'neg') + '">' + (e.summa > 0 ? '+' : '') + UI.money(e.summa) + '</b></div>';
      }).join('') + '</div>' : UI.empty('💰', 'Hali keshbek yo\'q. Birinchi to\'lovdan keyin hisoblanadi.'));
      UI.view(html);
    });
  }

  // ---------- 6. Buyurtmalarim ----------
  function orders() {
    return api('myOrders').then(function (list) {
      if (!list.length) return UI.view('<h1>Buyurtmalarim</h1>' + UI.empty('📦', 'Hali buyurtma yo\'q', '<a class="btn" href="#/order">Buyurtma berish</a>'));
      UI.view('<h1>Buyurtmalarim</h1><div class="list">' + list.map(function (o) {
        return '<a class="list-item link" href="#/' + (o.holat === 'tolov_kutish' ? 'pay/' : 'orders/') + esc(o.id) + '"><div class="grow">' +
          '<div class="row between"><b>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun</b>' + UI.statusBadge(o.holat, o.holat_nomi) + '</div>' +
          '<div class="small muted">' + UI.date(o.boshlanish) + ' — ' + UI.date(o.tugash) + ' · ' + som(o.tolanadi) + '</div>' +
          (o.holat === 'faol' ? UI.progress((o.kunlar - o.qolgan_kun) / o.kunlar * 100) : '') + '</div></a>';
      }).join('') + '</div>');
    });
  }

  function orderDetail(params) {
    return api('orderDetail', { id: params.id }).then(function (o) {
      renderOrder(o);
    });
  }

  function renderOrder(o) {
    var html = '<a class="back" href="#/orders">‹ Buyurtmalarim</a><div class="row between"><h1>' + esc(o.ratsion) + '</h1>' + UI.statusBadge(o.holat, o.holat_nomi) + '</div>' +
      '<div class="card"><div class="grid2">' +
      '<div><div class="muted small">Paket</div><b>' + o.kunlar + ' kun</b></div>' +
      '<div><div class="muted small">Qolgan</div><b>' + o.qolgan_kun + ' kun</b></div>' +
      '<div><div class="muted small">Boshlanish</div><b>' + UI.date(o.boshlanish) + '</b></div>' +
      '<div><div class="muted small">Tugash</div><b>' + UI.date(o.tugash) + '</b></div>' +
      '<div><div class="muted small">To\'langan</div><b>' + som(o.tolangan) + '</b></div>' +
      '<div><div class="muted small">To\'lov</div>' + UI.statusBadge(o.tolov_holati, o.tolov_holati_nomi) + '</div></div>' +
      '<div class="small mt">📍 ' + esc(o.manzil.nom || '') + ' — ' + esc(o.manzil.matn || '') +
      (o.holat === 'faol' || o.holat === 'tolov_kutish' ? ' <a href="#" data-click="addr">o\'zgartirish</a>' : '') + '</div></div>';
    if (o.holat === 'faol') {
      html += '<h3 class="sec">Kunlar</h3><p class="hint">Kunni bosib pauza qiling (' + o.pauza + '/' + o.pauza_limit + ' ishlatilgan). Pauza kuni paket oxiriga suriladi. ' +
        'Ertangi kunni faqat kesish vaqtigacha o\'zgartirish mumkin.</p>';
    }
    if (o.kunlar_jadvali.length) {
      html += UI.calendar(o.kunlar_jadvali, {
        action: 'day', clickable: function (d) { return d.pauza_mumkin || d.pauza_bekor_mumkin; }
      });
    }
    if (o.holat === 'tolov_kutish') html += '<a class="btn block mt" href="#/pay/' + esc(o.id) + '">To\'lov</a>';
    if (o.holat === 'tugadi' || o.holat === 'bekor') html += '<a class="btn block mt" href="#/order?ratsion=' + esc(o.ratsion_id) + '">🔁 Yana buyurtma berish</a>';
    UI.view(html, {
      day: function (el) {
        var d = o.kunlar_jadvali.filter(function (x) { return x.id === el.dataset.id; })[0];
        if (!d) return;
        var pause = d.holat === 'rejada';
        return UI.confirm(pause ? UI.date(d.sana, true) + ' kunini pauza qilasizmi? Paket oxiri 1 kunga suriladi.' :
          UI.date(d.sana, true) + ' pauzasini bekor qilasizmi?', pause ? 'Pauza' : 'Bekor qilish').then(function (y) {
          if (!y) return;
          return api(pause ? 'pauseDay' : 'unpauseDay', { buyurtma_id: o.id, yetkazish_id: d.id }).then(function (no) {
            UI.toast(pause ? 'Pauza qilindi. Yangi tugash: ' + UI.date(no.tugash) : 'Pauza bekor qilindi');
            renderOrder(no);
          });
        });
      },
      addr: function () {
        return api('addresses').then(function (a) {
          var s = UI.sheet('Manzilni tanlang', '<div class="list">' + a.items.map(function (x) {
            return '<button class="list-item link" data-click="pick" data-id="' + esc(x.id) + '"><div class="grow"><b>' + esc(x.nom) + '</b><div class="small">' + esc(x.matn) + '</div></div></button>';
          }).join('') + '</div><a class="btn ghost block mt" href="#/addresses/new">+ Yangi manzil</a>', {
            pick: function (el) {
              return api('changeOrderAddress', { buyurtma_id: o.id, manzil_id: el.dataset.id }).then(function (no) {
                s.close(); UI.toast('Manzil yangilandi (keyingi kunlar uchun)'); renderOrder(no);
              });
            }
          });
        });
      }
    });
  }

  // ---------- 7. Manzillarim ----------
  function addresses() {
    return api('addresses').then(function (d) {
      UI.view('<h1>Manzillarim</h1>' + (d.items.length ? '<div class="list">' + d.items.map(function (a) {
        return '<a class="list-item link" href="#/addresses/' + esc(a.id) + '"><span class="li-ico">' + (a.lat !== '' ? '📍' : '🏠') + '</span><div class="grow"><b>' + esc(a.nom) + '</b> · <span class="muted">' + esc(a.hudud) + '</span>' +
          '<div class="small">' + esc(a.matn) + (a.moljal ? ' (' + esc(a.moljal) + ')' : '') + '</div></div><span class="muted">›</span></a>';
      }).join('') + '</div>' : UI.empty('🏠', 'Manzil yo\'q')) + '<a class="btn block mt" href="#/addresses/new">+ Manzil qo\'shish</a>');
    });
  }

  function addressEdit(params) {
    return api('addresses').then(function (d) {
      var a = params.id === 'new' ? { nom: '' } : d.items.filter(function (x) { return x.id === params.id; })[0];
      if (!a) return UI.go('addresses');
      UI.view('<a class="back" href="#/addresses">‹ Manzillarim</a><h1>' + (a.id ? 'Manzilni tahrirlash' : 'Yangi manzil') + '</h1><div id="af"></div>' +
        (a.id ? '<button class="btn link-btn block mt danger-text" data-click="del">Manzilni o\'chirish</button>' : ''), {
        del: function () {
          return UI.confirm('Manzil o\'chirilsinmi?', 'O\'chirish', true).then(function (y) {
            if (y) return api('addressRemove', { id: a.id }).then(function () { UI.go('addresses'); });
          });
        }
      });
      AddrForm.form(document.getElementById('af'), {
        addr: a, hududlar: d.hududlar, telegramLocation: true,
        onSubmit: function (data) {
          return api('addressSave', data).then(function () { UI.toast('Saqlandi'); history.back(); });
        }
      });
    });
  }

  // ---------- Menyu (katalog rasmlari) ----------
  function catalogPage() {
    return api('catalog').then(function (c) {
      if (!c.rasmlar.length) return UI.view('<h1>🍽 Menyu</h1>' + UI.empty('🍽', 'Menyu hali joylanmagan'));
      UI.view('<h1>🍽 Menyu</h1><p class="muted small">6 kunlik menyu: dushanba — 1-kun, seshanba — 2-kun ... shanba — 6-kun. Yakshanba dam olish kuni.</p>' +
        (c.yangilangan ? '<p class="small muted">Yangilangan: ' + UI.date(c.yangilangan) + '</p>' : '') +
        c.rasmlar.map(function (x) {
          return '<a class="catalog-img" href="#" data-click="open" data-url="' + esc(x.url) + '"><img loading="lazy" src="' + esc(x.url) + '" alt="' + esc(x.nom || 'Menyu') + '"></a>';
        }).join('') + '<a class="btn block mt" href="#/order">🛒 Buyurtma berish</a>', {
        open: function (el) { UI.openLink(el.dataset.url); }
      });
    });
  }

  // ---------- Salomatlik: kaloriya tavsiyasi va vazn ----------
  function weightChart(tarix) {
    if (tarix.length < 2) return '';
    var w = 300, h = 90, pad = 8;
    var vals = tarix.map(function (x) { return x.vazn; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max += 1; min -= 1; }
    var pts = vals.map(function (v, i) {
      var x = pad + i * (w - 2 * pad) / (vals.length - 1);
      var y = pad + (max - v) * (h - 2 * pad) / (max - min);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="weight-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  }

  function healthPage(params, query) {
    return api('health').then(function (hv) {
      var p = hv.profil;
      var year = new Date().getFullYear();
      var html = '<h1>🎯 Kaloriya va vazn</h1>';
      if (query.yangi) html += '<div class="card ok">✅ Ro\'yxatdan o\'tdingiz! Endi o\'zingizga mos kaloriyani bilib oling (ixtiyoriy).</div>';
      if (hv.toliq && !hv.tavsiya) {
        html += '<div class="card accent"><div class="muted small">Kunlik ehtiyojingiz taxminan</div><div class="big">' + UI.money(hv.kkal) + ' kkal</div>' +
          '<p class="small muted">Kaloriya variantlari hali kiritilmagan, shuning uchun mos variantni ko\'rsata olmadik. Tez orada qo\'shiladi.</p></div>';
      }
      if (hv.toliq && hv.tavsiya) {
        html += '<div class="card accent"><div class="muted small">Kunlik ehtiyojingiz taxminan</div><div class="big">' + UI.money(hv.kkal) + ' kkal</div>' +
          '<div class="mt">Sizga mos variant: <b>' + esc(hv.tavsiya.ratsion) + '</b>' + (hv.tavsiya.kaloriya ? ' (' + esc(hv.tavsiya.kaloriya) + ' kkal)' : '') +
          ' — kuniga ' + som(hv.tavsiya.kunlik_narx) + '</div>' +
          '<a class="btn block mt" href="#/order?ratsion=' + esc(hv.tavsiya.ratsion_id) + '">Shu variantni tanlash</a>' +
          '<p class="hint">Tavsiya taxminiy. Boshqa variantni ham tanlashingiz mumkin.</p></div>';
      }
      if (p.vazn) {
        var stt = hv.statistika;
        html += '<div class="card' + (hv.sorash_kerak ? ' warn' : '') + '"><h3>⚖️ Vazn</h3>' +
          (hv.sorash_kerak ? '<p>' + hv.sorash_kun + ' kun o\'tdi — bugungi vazningizni kiriting.</p>' : '') +
          '<form class="row gap" data-submit="weight"><input name="vazn" type="number" step="0.1" min="30" max="300" inputmode="decimal" class="grow" placeholder="Bugungi vazn, kg" required>' +
          '<button class="btn">Saqlash</button></form>' +
          (stt ? '<div class="grid2 mt"><div><div class="muted small">Boshida (' + UI.date(stt.boshlangich_sana) + ')</div><b>' + stt.boshlangich + ' kg</b></div>' +
            '<div><div class="muted small">Hozir (' + UI.date(stt.joriy_sana) + ')</div><b>' + stt.joriy + ' kg</b></div></div>' +
            (stt.ozgarish ? '<div class="mt ' + (stt.ozgarish < 0 ? 'save' : '') + '"><b>' + (stt.ozgarish < 0 ? '📉 ' : '📈 ') + (stt.ozgarish > 0 ? '+' : '') + stt.ozgarish + ' kg</b></div>' : '') : '') +
          weightChart(hv.tarix) +
          (hv.tarix.length > 1 ? '<details class="mt"><summary class="small">Tarix</summary>' + hv.tarix.slice().reverse().map(function (x) {
            return '<div class="row between small"><span>' + UI.date(x.sana) + '</span><b>' + x.vazn + ' kg</b></div>';
          }).join('') + '</details>' : '') + '</div>';
      }
      html += '<form class="card stack" data-submit="save"><h3>' + (hv.toliq ? 'Ma\'lumotlarim' : 'Ma\'lumotlaringizni kiriting') + '</h3>' +
        '<div class="field"><span class="field-label">Jins</span><div class="chips">' +
        [['erkak', 'Erkak'], ['ayol', 'Ayol']].map(function (x) {
          return '<label class="chip"><input type="radio" name="jins" value="' + x[0] + '"' + (p.jins === x[0] ? ' checked' : '') + ' required><span>' + x[1] + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="grid2">' +
        UI.field('Tug\'ilgan yil', '<input name="tugilgan_yil" type="number" inputmode="numeric" min="' + (year - 100) + '" max="' + (year - 10) + '" value="' + esc(p.tugilgan_yil) + '" placeholder="1990" required>') +
        UI.field('Bo\'y, sm', '<input name="boy" type="number" inputmode="numeric" min="100" max="230" value="' + esc(p.boy) + '" placeholder="170" required>') +
        '</div>' +
        UI.field('Vazn, kg', '<input name="vazn" type="number" step="0.1" inputmode="decimal" min="30" max="300" value="' + esc(p.vazn) + '" placeholder="75" required>') +
        UI.field('Maqsadingiz', '<select name="maqsad" required>' + UI.options(hv.maqsadlar, p.maqsad, { empty: 'Tanlang' }) + '</select>') +
        UI.field('Turmush tarzingiz', '<select name="faollik" required>' + UI.options(hv.faolliklar, p.faollik, { empty: 'Tanlang' }) + '</select>') +
        '<button class="btn block">' + (hv.toliq ? 'Saqlash' : 'Tavsiya olish') + '</button>' +
        '<p class="hint">Har ' + hv.sorash_kun + ' kunda vazningizni so\'raymiz — natijangizni (ozish yoki vazn olish) kuzatib borasiz. Maqsad va vaznni istalgan payt shu yerda o\'zgartirasiz.</p></form>';
      if (query.yangi) html += '<a class="btn ghost block" href="#/order">Keyinroq — buyurtma berish</a>';
      UI.view(html, {
        save: function (form) {
          var d = UI.formData(form);
          if (String(d.vazn) === String(p.vazn)) delete d.vazn; // vazn o'zgarmagan — tarixga yozilmaydi
          return api('healthSave', d).then(function () { UI.toast('Saqlandi'); UI.haptic('success'); UI.go('health'); });
        },
        weight: function (form) {
          return api('healthSave', { vazn: UI.formData(form).vazn }).then(function () { UI.toast('Vazn saqlandi'); UI.haptic('success'); UI.reload(); });
        }
      });
    });
  }

  // ---------- 8. Profil ----------
  function profile() {
    return api('profile').then(function (p) {
      UI.view('<h1>Profil</h1><form class="card stack" data-submit="save">' +
        UI.field('Ism', '<input name="ism" value="' + esc(p.ism) + '" maxlength="80" required>') +
        UI.field('Telefon', '<input value="' + esc(p.telefon) + '" disabled>', 'Raqam bir marta kiritiladi. O\'zgartirish admin orqali.') +
        UI.field('Til', '<select name="til"><option value="uz" selected>O\'zbekcha (lotin)</option><option value="ru" disabled>Русский (tez orada)</option></select>') +
        '<button class="btn block">Saqlash</button></form>' +
        (p.telefon_sorov ? '<div class="card warn small">Telefon o\'zgartirish so\'rovi yuborilgan: ' + esc(p.telefon_sorov) + '</div>' :
          '<button class="btn ghost block" data-click="phone">📞 Telefon raqamni o\'zgartirish so\'rovi</button>') +
        '<p class="small muted center mt">Ro\'yxatdan o\'tgan: ' + UI.date(p.royxatdan_sana) + '</p>', {
        save: function (form) {
          return api('profileUpdate', UI.formData(form)).then(function () { UI.toast('Saqlandi'); });
        },
        phone: function () {
          var s = UI.sheet('Yangi raqam', '<form data-submit="send" class="stack">' +
            UI.field('Yangi telefon', '<input name="telefon" type="tel" placeholder="+998 90 123 45 67" required>') +
            '<button class="btn block">So\'rov yuborish</button></form>', {
            send: function (form) {
              return api('requestPhoneChange', UI.formData(form)).then(function () { s.close(); UI.toast('So\'rov yuborildi'); UI.reload(); });
            }
          });
        }
      });
    });
  }

  function start(me) {
    if (!me.royxatdan_otgan) { registration(me); return; }
    UI.setNav([
      { path: '', icon: '🏠', label: 'Bosh sahifa' },
      { path: 'order', icon: '🛒', label: 'Buyurtma' },
      { path: 'orders', icon: '📦', label: 'Buyurtmalarim' },
      { path: 'catalog', icon: '🍽', label: 'Menyu' },
      { path: 'discounts', icon: '💲', label: 'Narxlar', more: true },
      { path: 'health', icon: '🎯', label: 'Kaloriya va vazn', more: true },
      { path: 'cashback', icon: '💰', label: 'Keshbek', more: true },
      { path: 'addresses', icon: '📍', label: 'Manzillarim', more: true },
      { path: 'profile', icon: '👤', label: 'Profil', more: true }
    ]);
    UI.route('', home);
    UI.route('order', orderPage);
    UI.route('pay/:id', payPage);
    UI.route('discounts', discounts);
    UI.route('catalog', catalogPage);
    UI.route('health', healthPage);
    UI.route('cashback', cashback);
    UI.route('orders', orders);
    UI.route('orders/:id', orderDetail);
    UI.route('addresses', addresses);
    UI.route('addresses/:id', addressEdit);
    UI.route('profile', profile);
    UI.start();
  }

  window.ClientApp = { start: start };
})();
