create policy "Customers delete own orphan payment slips"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-slips'
  and public.is_approved_customer()
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.payments
    where slip_path = storage.objects.name
  )
);

create policy "Staff delete orphan order photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'order-photos'
  and public.is_staff_or_admin()
  and not exists (
    select 1
    from public.order_photos
    where storage_path = storage.objects.name
  )
);
