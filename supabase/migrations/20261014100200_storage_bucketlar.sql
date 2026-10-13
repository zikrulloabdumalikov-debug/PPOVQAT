-- Yopiq bucket'lar: cheklar (to'lov/xarajat cheklari) va zaxira (tungi JSON nusxa, TZ 11.4).
-- public = false, policy yo'q: faqat service role (Edge Functions) o'qiydi/yozadi.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('cheklar', 'cheklar', false) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('zaxira', 'zaxira', false) on conflict (id) do nothing;
  end if;
end $$;
