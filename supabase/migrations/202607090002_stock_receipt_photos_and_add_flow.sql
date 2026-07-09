-- Stock management v2: goods-received photos + history.
-- 1. inventory_movements.photo_path: optional photo proving goods came in, kept
--    with the movement so the admin can review it later.
-- 2. stock-photos: private bucket (staff/admin read, admin write) for those photos.
-- 3. adjust_inventory gains an optional photo_path stored on the movement row.

alter table public.inventory_movements
  add column if not exists photo_path text;

-- Private bucket for restock / goods-received photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stock-photos', 'stock-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff read stock photos" on storage.objects;
create policy "Staff read stock photos"
on storage.objects for select
to authenticated
using (bucket_id = 'stock-photos' and public.is_staff_or_admin());

drop policy if exists "Admins upload stock photos" on storage.objects;
create policy "Admins upload stock photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'stock-photos' and public.is_admin());

drop policy if exists "Admins delete stock photos" on storage.objects;
create policy "Admins delete stock photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'stock-photos' and public.is_admin());

-- Replace adjust_inventory with a 4-arg version that also records the photo.
-- Old 3-arg callers still resolve here via the photo_path default.
drop function if exists public.adjust_inventory(uuid, integer, text);

create or replace function public.adjust_inventory(
  target_product_id uuid,
  quantity_delta integer,
  note text default null,
  photo_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  before_qty integer;
  after_qty integer;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can adjust inventory';
  end if;

  if quantity_delta = 0 then
    raise exception 'Adjustment quantity cannot be zero';
  end if;

  select quantity_available
    into before_qty
  from public.inventory
  where product_id = target_product_id
  for update;

  if not found then
    raise exception 'Inventory record missing';
  end if;

  after_qty := before_qty + quantity_delta;

  if after_qty < 0 then
    raise exception 'Inventory cannot become negative';
  end if;

  update public.inventory
  set quantity_available = after_qty
  where product_id = target_product_id;

  insert into public.inventory_movements (
    product_id,
    type,
    quantity_delta,
    quantity_after,
    note,
    photo_path,
    created_by
  )
  values (
    target_product_id,
    (
      case
        when quantity_delta > 0 then 'restock'
        else 'manual_adjustment'
      end
    )::public.inventory_movement_type,
    quantity_delta,
    after_qty,
    nullif(note, ''),
    nullif(photo_path, ''),
    actor
  );
end;
$$;

grant execute on function public.adjust_inventory(uuid, integer, text, text) to authenticated;
revoke execute on function public.adjust_inventory(uuid, integer, text, text) from public, anon;
