with seed_categories (name, description, sort_order) as (
  values
    ('เสื้อยืด', 'เสื้อยืดและเสื้อใส่ประจำวันสำหรับขายส่ง', 10),
    ('เสื้อเชิ้ต', 'เชิ้ตและเสื้อทำงานทรงเรียบ', 20),
    ('แจ็คเก็ต', 'แจ็คเก็ต เบลเซอร์ และเสื้อตัวนอก', 30),
    ('เดรสและกระโปรง', 'เดรส กระโปรง และสินค้าแฟชั่นผู้หญิง', 40),
    ('รองเท้า', 'รองเท้าแฟชั่นและรองเท้าลำลอง', 50)
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
),
seed_products (
  category_name,
  sku,
  name,
  description,
  unit,
  price,
  quantity_available,
  low_stock_threshold,
  sort_order,
  image_path
) as (
  values
    (
      'เสื้อยืด',
      'NAK-TEE-001',
      'เสื้อยืด Heavy Cotton สีขาว',
      'ผ้าคอตตอนหนานุ่ม ทรง regular เหมาะสำหรับร้านที่ต้องการสินค้าขายง่าย ใส่ได้ทุกวัน',
      'ชิ้น',
      390.00,
      64,
      12,
      101,
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'เสื้อยืด',
      'NAK-TEE-002',
      'เสื้อยืด Oversize สีดำ',
      'ทรง oversize ไหล่ตก ผิวผ้านุ่ม เหมาะกับลูกค้าวัยรุ่นและร้านเสื้อผ้าแนว street casual',
      'ชิ้น',
      450.00,
      48,
      10,
      102,
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'เสื้อเชิ้ต',
      'NAK-SHIRT-003',
      'เชิ้ต Linen Relaxed สีฟ้า',
      'เชิ้ตผ้าลินินผสม ทรงโปร่ง ใส่สบาย เหมาะกับร้านค้าที่ขายสินค้าสไตล์มินิมอล',
      'ชิ้น',
      690.00,
      36,
      8,
      103,
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'เดรสและกระโปรง',
      'NAK-DRESS-004',
      'เดรส Midi Satin สีครีม',
      'เดรสผ้าซาตินทรง midi เหมาะสำหรับงาน casual dinner และหน้าร้านที่ต้องการสินค้า premium look',
      'ชิ้น',
      1290.00,
      22,
      5,
      104,
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'แจ็คเก็ต',
      'NAK-JACKET-005',
      'แจ็คเก็ต Utility สีน้ำตาล',
      'แจ็คเก็ตกระเป๋าหน้า ผ้าทน ใช้ได้ทั้งลุค outdoor และ casual เหมาะสำหรับขายเป็น outerwear หลัก',
      'ชิ้น',
      1490.00,
      18,
      4,
      105,
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'แจ็คเก็ต',
      'NAK-BLAZER-006',
      'เบลเซอร์ Tailored สีเทา',
      'เบลเซอร์ทรงเข้ารูปพอดีตัว ใช้กับชุดทำงานหรือ smart casual ได้ง่าย',
      'ชิ้น',
      1690.00,
      14,
      4,
      106,
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'เดรสและกระโปรง',
      'NAK-SKIRT-007',
      'กระโปรง Pleated สีดำ',
      'กระโปรงพลีททรงคลาสสิก ผ้าอยู่ทรง เหมาะกับสินค้าขายซ้ำในหลายไซซ์',
      'ชิ้น',
      790.00,
      30,
      6,
      107,
      'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'รองเท้า',
      'NAK-SHOE-008',
      'รองเท้า Lifestyle Runner',
      'รองเท้าลำลองทรง runner น้ำหนักเบา เหมาะกับการขายคู่กับเสื้อผ้าแนว everyday wear',
      'คู่',
      1890.00,
      26,
      6,
      108,
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'
    ),
    (
      'เสื้อยืด',
      'NAK-KNIT-009',
      'เสื้อ Knit Crewneck สีเทา',
      'เสื้อ knit เนื้อนุ่ม ทรงเรียบ ใช้เป็นสินค้าแนะนำในฤดูฝนหรือห้องแอร์ได้ดี',
      'ชิ้น',
      890.00,
      20,
      5,
      109,
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80'
    )
),
upserted_products as (
  insert into public.products (
    category_id,
    sku,
    name,
    description,
    unit,
    price,
    image_path,
    is_active,
    sort_order
  )
  select
    c.id,
    p.sku,
    p.name,
    p.description,
    p.unit,
    p.price,
    p.image_path,
    true,
    p.sort_order
  from seed_products p
  join upserted_categories c on c.name = p.category_name
  on conflict (sku) do update
  set category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      unit = excluded.unit,
      price = excluded.price,
      image_path = excluded.image_path,
      is_active = true,
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
    s.quantity_available,
    s.low_stock_threshold
  from upserted_products p
  join seed_products s on s.sku = p.sku
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
  'Clothing demo seed'
from upserted_inventory i
where not exists (
  select 1
  from public.inventory_movements existing
  where existing.product_id = i.product_id
    and existing.note = 'Clothing demo seed'
);

update public.products
set is_active = false
where sku in ('DEMO-BOX-001', 'DEMO-TAPE-002', 'DEMO-WRAP-003');
