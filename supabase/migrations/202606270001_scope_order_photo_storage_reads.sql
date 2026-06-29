-- Security fix: restrict order-photos storage reads to the order's owner.
--
-- The order_photos TABLE policy was already owner-scoped, but the storage
-- bucket read policy only required `is_approved_customer()`, so any approved
-- customer could read every customer's packed-order photos via a signed URL.
-- This mirrors the existing (correct) payment-slips ownership pattern.
--
-- Photo paths are stored as "{order_id}/{timestamp}-{filename}", so we match
-- the first path segment against orders the caller owns. We compare the known
-- valid order uuid cast to text (o.id::text) rather than casting the untrusted
-- path segment to uuid, which avoids cast errors on unexpected paths.

drop policy if exists "Customers and staff read order photos" on storage.objects;

create policy "Customers and staff read order photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'order-photos'
  and (
    public.is_staff_or_admin()
    or exists (
      select 1
      from public.orders o
      where o.id::text = (storage.foldername(name))[1]
        and o.customer_id = auth.uid()
    )
  )
);
