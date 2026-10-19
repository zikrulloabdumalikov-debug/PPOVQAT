-- 1) Ratsion kaloriyasi oraliq bo'lishi mumkin ("900–1000"): matn ustuniga o'tkaziladi (mavjud sonlar saqlanadi).
alter table ratsionlar alter column kaloriya type text using kaloriya::text;

-- 2) Oylik katalog rasmlari: ochiq bucket (marketing materiali, mijozlar ko'radi).
--    Yuklash faqat Edge Function (service role) orqali; policy yo'q — anon yoza olmaydi.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('katalog', 'katalog', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
      on conflict (id) do nothing;
  end if;
end $$;
