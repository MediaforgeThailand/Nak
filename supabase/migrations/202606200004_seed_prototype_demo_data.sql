with demo_products (sku, name, description, unit, price, quantity_available, low_stock_threshold, sort_order) as (
  values
    (
      'DEMO-BOX-001',
      'กล่องบรรจุสินค้าเดโม',
      'สินค้าตัวอย่างสำหรับทดสอบการสั่งซื้อและการตัดสต็อก',
      'กล่อง',
      120.00,
      24,
      5,
      10
    ),
    (
      'DEMO-TAPE-002',
      'เทปแพ็คสินค้าเดโม',
      'สินค้าตัวอย่างสำหรับเพิ่มลงตะกร้าและดูยอดรวม',
      'ม้วน',
      65.00,
      40,
      8,
      20
    ),
    (
      'DEMO-WRAP-003',
      'ฟิล์มห่อสินค้าเดโม',
      'สินค้าตัวอย่างที่มีสต็อกน้อยเพื่อทดสอบ low stock',
      'แพ็ค',
      180.00,
      6,
      8,
      30
    )
),
upserted_products as (
  insert into public.products (
    sku,
    name,
    description,
    unit,
    price,
    is_active,
    sort_order
  )
  select
    sku,
    name,
    description,
    unit,
    price,
    true,
    sort_order
  from demo_products
  on conflict (sku) do update
  set name = excluded.name,
      description = excluded.description,
      unit = excluded.unit,
      price = excluded.price,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order
  returning id, sku
),
upserted_inventory as (
  insert into public.inventory (
    product_id,
    quantity_available,
    low_stock_threshold
  )
  select
    p.id,
    d.quantity_available,
    d.low_stock_threshold
  from upserted_products p
  join demo_products d on d.sku = p.sku
  on conflict (product_id) do update
  set quantity_available = greatest(public.inventory.quantity_available, excluded.quantity_available),
      low_stock_threshold = excluded.low_stock_threshold
  returning product_id, quantity_available
)
insert into public.inventory_movements (
  product_id,
  type,
  quantity_delta,
  quantity_after,
  note
)
select
  i.product_id,
  'initial',
  i.quantity_available,
  i.quantity_available,
  'Prototype demo seed'
from upserted_inventory i
where not exists (
  select 1
  from public.inventory_movements existing
  where existing.product_id = i.product_id
    and existing.note = 'Prototype demo seed'
);

insert into public.customer_addresses (
  customer_id,
  label,
  recipient_name,
  phone,
  address_line1,
  district,
  province,
  postal_code,
  is_default
)
select
  id,
  'Prototype demo address',
  coalesce(nullif(full_name, ''), 'ผู้รับสินค้าเดโม'),
  phone,
  'ที่อยู่สำหรับทดลองสั่งสินค้า',
  'อำเภอเมือง',
  'กรุงเทพมหานคร',
  '10200',
  true
from public.profiles
where email = 'taksinkubpom@gmail.com'
  and not exists (
    select 1
    from public.customer_addresses existing
    where existing.customer_id = profiles.id
      and existing.label = 'Prototype demo address'
  );
