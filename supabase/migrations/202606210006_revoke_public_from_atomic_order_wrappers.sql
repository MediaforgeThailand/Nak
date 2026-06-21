revoke execute on function public.approve_order_and_start_packing(uuid, text) from public;
revoke execute on function public.ship_order_with_photo(uuid, text, text) from public;

grant execute on function public.approve_order_and_start_packing(uuid, text) to authenticated;
grant execute on function public.ship_order_with_photo(uuid, text, text) to authenticated;
