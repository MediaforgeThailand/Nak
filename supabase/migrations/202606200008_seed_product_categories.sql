with seed_categories (name, description, sort_order) as (
  values
    ('บรรจุภัณฑ์', 'กล่องและวัสดุสำหรับแพ็คสินค้า', 10),
    ('อุปกรณ์แพ็คสินค้า', 'เทป ฟิล์ม และอุปกรณ์เสริมสำหรับจัดส่ง', 20)
),
upserted_categories as (
  insert into public.product_categories (name, description, sort_order)
  select name, description, sort_order
  from seed_categories
  on conflict (name)
  do update set
    description = excluded.description,
    sort_order = excluded.sort_order
  returning id, name
)
update public.products p
set category_id = c.id
from upserted_categories c
where
  p.category_id is null
  and (
    (p.sku = 'DEMO-BOX-001' and c.name = 'บรรจุภัณฑ์')
    or (p.sku in ('DEMO-TAPE-002', 'DEMO-WRAP-003') and c.name = 'อุปกรณ์แพ็คสินค้า')
  );
