-- v2: ma'lumot modelini ilova mantiqiga moslash (biznes qoidalar o'zgarmaydi).

-- 1) Yetishmayotgan ustunlar
alter table audit add column if not exists muhim text;                          -- muhim amallar belgisi (TZ 11.3)
alter table xarajatlar add column if not exists davr_oy text;                   -- doimiy/oylik xarajat qaysi oyga bo'linadi
alter table xarajatlar add column if not exists manba text;                     -- reklama manbasi (jalb qilish narxi)
alter table xarajatlar add column if not exists tasdiqlagan text;               -- katta xarajatni tasdiqlagan sherik
alter table oyliklar add column if not exists ishlagan_kun integer not null default 0;
alter table oyliklar add column if not exists yetkazish_soni integer not null default 0;

-- 2) Kunlik menyu (admin "Menyu" bo'limi, mijoz bosh sahifasi)
create table if not exists menyu (
  id text primary key,
  sana date not null,
  ratsion_id text references ratsionlar(id),
  taomlar text,
  kaloriya integer,
  faol boolean not null default true
);

-- 3) Kiritilish tartibi: bir kunda bir nechta keshbek harakati FIFO da shu tartibda hisoblanadi
do $$
declare t text;
begin
  foreach t in array array['foydalanuvchilar','mijozlar','manzillar','ratsionlar','narxlar','paketlar','keshbek_qoida',
    'buyurtmalar','yetkazishlar','tolovlar','keshbek_harakat','xarajat_turkum','xarajatlar','xodimlar','oyliklar',
    'audit','sozlama','menyu'] loop
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'tartib') then
      execute format('alter table %I add column tartib bigint generated always as identity', t);
    end if;
  end loop;
end $$;

-- 4) Telegram ID: faqat faol yozuvlar orasida unikal (anonimlashtirilgan va o'chirilgan yozuvlar to'sqinlik qilmaydi)
alter table foydalanuvchilar alter column tg_id drop not null;
alter table foydalanuvchilar drop constraint if exists foydalanuvchilar_tg_id_key;
create unique index if not exists foydalanuvchilar_tg_id_faol_uq on foydalanuvchilar (tg_id) where faol and tg_id is not null;
alter table mijozlar drop constraint if exists mijozlar_tg_id_key;
create unique index if not exists mijozlar_tg_id_faol_uq on mijozlar (tg_id) where faol and tg_id is not null;

-- 5) Mavjud qoidalarni baza darajasida kafolatlash
create unique index if not exists mijozlar_telefon_faol_uq on mijozlar (telefon) where faol and telefon is not null;   -- 11.2
create unique index if not exists keshbek_hisoblandi_tolov_uq on keshbek_harakat (manba_id) where tur = 'hisoblandi'; -- 11.2
create unique index if not exists oyliklar_xodim_oy_uq on oyliklar (xodim_id, oy);                                    -- 9.3
create unique index if not exists menyu_sana_ratsion_faol_uq on menyu (sana, ratsion_id) where faol;

-- 6) Vaqtinchalik kesh: so'rovlar chegarasi, ulashilgan telefon/joylashuv, job belgilari, webhook takrori
create table if not exists kesh (
  kalit text primary key,
  qiymat text,
  tugash timestamptz
);

-- 7) Tezlik uchun indekslar
create index if not exists buyurtmalar_mijoz_idx on buyurtmalar (mijoz_id);
create index if not exists yetkazishlar_buyurtma_idx on yetkazishlar (buyurtma_id);
create index if not exists yetkazishlar_mijoz_idx on yetkazishlar (mijoz_id);
create index if not exists yetkazishlar_sana_idx on yetkazishlar (sana);
create index if not exists tolovlar_buyurtma_idx on tolovlar (buyurtma_id);
create index if not exists keshbek_harakat_mijoz_idx on keshbek_harakat (mijoz_id);
create index if not exists manzillar_mijoz_idx on manzillar (mijoz_id);
