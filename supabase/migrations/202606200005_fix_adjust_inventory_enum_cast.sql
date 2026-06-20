create or replace function public.adjust_inventory(
  target_product_id uuid,
  quantity_delta integer,
  note text default null
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
    actor
  );
end;
$$;

grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
