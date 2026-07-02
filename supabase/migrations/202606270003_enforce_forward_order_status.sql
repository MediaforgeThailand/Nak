-- Enforce forward-only order status transitions in update_order_status.
--
-- Previously the function only blocked moving INTO pending_admin/rejected/
-- cancelled and moving FROM terminal states, but it still allowed sideways or
-- backward moves among approved/packing/ready_to_ship/shipping (e.g. a shipped
-- order could be pushed back to packing). We now require the target status to
-- rank strictly higher than the current one. All existing flows are forward
-- moves (approve -> packing, packing -> shipping), so they are unaffected.

create or replace function public.update_order_status(
  target_order_id uuid,
  new_status public.order_status,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
  current_rank integer;
  next_rank integer;
begin
  if actor is null or not public.is_staff_or_admin() then
    raise exception 'Only staff can update order status';
  end if;

  if new_status in ('pending_admin', 'rejected', 'cancelled') then
    raise exception 'Use approval or rejection flows for this status';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status in ('pending_admin', 'rejected', 'cancelled', 'delivered') then
    raise exception 'Order status cannot be changed from current state';
  end if;

  current_rank := case order_row.status
    when 'approved' then 1
    when 'packing' then 2
    when 'ready_to_ship' then 3
    when 'shipping' then 4
    when 'delivered' then 5
    else 0
  end;
  next_rank := case new_status
    when 'approved' then 1
    when 'packing' then 2
    when 'ready_to_ship' then 3
    when 'shipping' then 4
    when 'delivered' then 5
    else 0
  end;

  if next_rank <= current_rank then
    raise exception 'Order status can only move forward';
  end if;

  if new_status = 'shipping' and not exists (
    select 1 from public.order_photos where order_id = target_order_id
  ) then
    raise exception 'Packed product photo is required before shipping';
  end if;

  update public.orders
  set status = new_status,
      admin_note = coalesce(nullif(note, ''), public.orders.admin_note)
  where id = target_order_id;

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload)
  values (
    'order_status_changed',
    order_row.customer_id,
    order_row.id,
    jsonb_build_object('order_id', order_row.id, 'status', new_status)
  );
end;
$$;

grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
