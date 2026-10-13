/**
 * Avtomatik ishlar (time-driven trigger, har 15 daqiqada cronTick).
 * Har bir ish kuniga bir marta bajariladi (Script Properties'da belgi).
 *
 *  - tungi: zaxira nusxa (11.4), keshbek muddati, tugagan paketlar, mijoz holatlari
 *  - ertalab: "Bugun ovqatingiz yo'lda" (6.3)
 *  - eslatmalar: paket tugashiga 2 kun, keshbek tugashiga 7 kun (6.3)
 *  - kesish vaqti: kuryer biriktirish, zaxira ro'yxat Telegram guruhga, oshxona hisoboti (8.2, 11.4)
 *  - har soat: 48 soatdan eski to'lanmagan buyurtmalar qayta hisoblanadi (5.2)
 */

function cronTick() {
  dbReset_();
  var props = PropertiesService.getScriptProperties();
  var t = today_();
  var hm = hmToMin_(nowHM_());
  var once = function (name, atHm, fn) {
    var key = 'job_' + name + '_' + t;
    if (hm < hmToMin_(atHm) || props.getProperty(key)) return;
    props.setProperty(key, nowIso_());
    try {
      fn();
    } catch (e) {
      console.error('Job ' + name + ' xatosi: ' + (e && e.stack || e));
      notifyPartners_('⚠️ Avtomatik ish "' + name + '" xato bilan tugadi: ' + (e && e.message || e));
    }
    flushNotifications_();
  };
  once('tungi', '00:05', jobNightly_);
  once('ertalab', setting_('ertalabki_xabar_vaqti'), jobMorning_);
  once('eslatma', setting_('eslatma_vaqti'), jobReminders_);
  once('kesish', setting_('kesish_vaqti'), jobCutoff_);
  var hourKey = 'job_soat_' + t + '_' + nowHM_().slice(0, 2);
  if (!props.getProperty(hourKey)) {
    props.setProperty(hourKey, '1');
    try { jobStaleOrders_(); } catch (e) { console.error(e); }
    flushNotifications_();
  }
  cleanupJobFlags_(props, t);
}

function cleanupJobFlags_(props, t) {
  var cutoff = addDays_(t, -3);
  var keys = props.getKeys();
  keys.forEach(function (k) {
    var m = k.match(/^job_[a-z]+_(\d{4}-\d{2}-\d{2})/);
    if (m && m[1] < cutoff) props.deleteProperty(k);
  });
}

function jobNightly_() {
  withLock_(function () {
    cbExpireAll_();
    var t = today_();
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'faol'; }).forEach(function (o) {
      finishOrderIfDone_(o, 'tizim');
    });
    all_('Mijozlar').forEach(function (c) { if (c.faol) updateClientStatus_(c.id); });
    audit_('tizim', 'tungi_job', 'Sozlama', t, '', { ok: true });
  });
  backupNow_();
}

function jobMorning_() {
  var t = today_();
  var seen = {};
  where_('Yetkazishlar', function (d) { return d.sana === t && d.holat === 'rejada'; }).forEach(function (d) {
    if (seen[d.mijoz_id]) return;
    seen[d.mijoz_id] = true;
    notifyClient_(d.mijoz_id, '🥗 Bugun ovqatingiz yo\'lda! Yetkazish vaqti: ' + setting_('yetkazish_vaqti') + '.');
  });
}

function jobReminders_() {
  var t = today_();
  var days = settingNum_('paket_eslatma_kun') || 2;
  withLock_(function () {
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'faol' && !o.eslatma_yuborildi; }).forEach(function (o) {
      var left = remainingDays_(o.id);
      if (left > days) return;
      var nextAfter = where_('Buyurtmalar', function (x) {
        return x.mijoz_id === o.mijoz_id && x.id !== o.id && (x.holat === 'tolov_kutish' || (x.holat === 'faol' && x.boshlanish > o.tugash));
      }).length;
      if (!nextAfter) {
        notifyClient_(o.mijoz_id, '⏳ Paketingiz tugashiga ' + left + ' kun qoldi (oxirgi kun ' + fmtDate_(o.tugash) +
          '). Davom etasizmi? Uzoqroq paket olsangiz chegirma va keshbek ko\'proq!', openAppMarkup_('🔁 Davom ettirish'));
      }
      update_('Buyurtmalar', o.id, { eslatma_yuborildi: true }, 'tizim', { audit: false });
    });
  });
  var warn = settingNum_('keshbek_eslatma_kun') || 7;
  var target = addDays_(t, warn);
  var byClient = groupBy_(all_('KeshbekHarakat'), function (e) { return e.mijoz_id; });
  Object.keys(byClient).forEach(function (cid) {
    var sim = cashbackLots_(byClient[cid], t);
    var amount = sum_(sim.lots.filter(function (l) { return l.qoldiq > 0 && l.tugash === target; }), function (l) { return l.qoldiq; });
    if (amount > 0) {
      notifyClient_(cid, '💰 ' + fmtMoney_(amount) + ' so\'m keshbekingiz muddati ' + fmtDate_(target) +
        ' da tugaydi. Keyingi buyurtmada ishlating!', openAppMarkup_('🛒 Buyurtma berish'));
    }
  });
}

/** Kesish vaqti: ertangi ro'yxat yopiladi, kuryerlar biriktiriladi, zaxira ro'yxat guruhga yuboriladi. */
function jobCutoff_() {
  var tomorrow = addDays_(today_(), 1);
  withLock_(function () { autoAssign_(tomorrow); });
  sendBackupList_(tomorrow);
  var k = kitchenReport_(tomorrow);
  var lines = ['🍳 Oshxona hisoboti — ' + fmtDate_(tomorrow) + ': jami ' + k.jami + ' ta ratsion'];
  k.ratsionlar.forEach(function (r) { lines.push('• ' + r.ratsion + ': ' + r.soni + ' ta'); });
  notifyStaff_(lines.join('\n'));
}

/** Kuryer uchun zaxira: ilova ishlamay qolsa ham ro'yxat Telegram guruhda bo'ladi (11.4). */
function sendBackupList_(date) {
  var chat = setting_('kuryer_guruh_chat_id');
  if (!chat) return false;
  var text = backupListText_(date);
  // Telegram 4096 belgidan uzun xabarni qabul qilmaydi — bo'lib yuboramiz
  var parts = [];
  var cur = '';
  text.split('\n').forEach(function (line) {
    if ((cur + '\n' + line).length > 3800) { parts.push(cur); cur = line; } else { cur = cur ? cur + '\n' + line : line; }
  });
  if (cur) parts.push(cur);
  parts.forEach(function (p) { queueMessage_(chat, p); });
  return true;
}

function jobStaleOrders_() {
  withLock_(function () {
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'tolov_kutish'; }).forEach(function (o) {
      refreshStaleOrder_(o, 'tizim');
    });
  });
}

/**
 * Zaxira nusxa: har tunda to'liq nusxa (oxirgi 30 kun), har oyning birinchi nusxasi doimiy arxivga (11.4).
 */
function backupNow_() {
  var ss = ss_();
  var t = today_();
  var folder = privateFolder_('backup_papka_id', "Sog'lom Ovqatlar — zaxira (30 kun)");
  var file = DriveApp.getFileById(ss.getId());
  var name = 'Zaxira ' + t + ' — ' + ss.getName();
  file.makeCopy(name, folder);
  if (t.slice(8, 10) === '01') {
    var archive = privateFolder_('arxiv_papka_id', "Sog'lom Ovqatlar — oylik arxiv");
    file.makeCopy('Arxiv ' + t.slice(0, 7) + ' — ' + ss.getName(), archive);
  }
  var limit = now_().getTime() - 30 * 86400000;
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getDateCreated().getTime() < limit) f.setTrashed(true);
  }
  dbFlush_();
}
