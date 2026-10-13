-- IXTIYORIY: TZ dagi misol qiymatlar (Apps Script dagi seedExample bilan bir xil).
-- Sheriklar haqiqiy narxlarni ilovadagi "Narx va paketlar" bo'limidan kiritadi.
-- Supabase → SQL Editor da bir marta ishga tushiring (bo'sh bazada).
insert into ratsionlar (id, nom, kaloriya, tavsif, tannarx_ovqat, tannarx_qadoq_yetkazish, faol)
  values ('r_ozish', 'Ozish Express', 1200, 'Kuniga 5 mahal, ozish uchun', 44800, 22000, true) on conflict do nothing;
insert into narxlar (id, ratsion_id, kunlik_narx, qachondan, faol)
  values ('n_ozish_1', 'r_ozish', 120000, (now() at time zone 'Asia/Tashkent')::date, true) on conflict do nothing;
insert into paketlar (id, nom, kunlar, chegirma_foiz, qachondan, faol) values
  ('p_6', '6 kunlik', 6, 0, (now() at time zone 'Asia/Tashkent')::date, true),
  ('p_12', '12 kunlik', 12, 5, (now() at time zone 'Asia/Tashkent')::date, true),
  ('p_24', '24 kunlik', 24, 10, (now() at time zone 'Asia/Tashkent')::date, true) on conflict do nothing;
insert into keshbek_qoida (id, foiz, amal_muddati_kun, min_summa, max_ulush_foiz, qachondan)
  values ('k_1', 3, 60, 0, 30, (now() at time zone 'Asia/Tashkent')::date) on conflict do nothing;
