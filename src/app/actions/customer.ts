"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/storage";

const cartItemSchema = z.object({
  product_id: z.uuid(),
  quantity: z.coerce.number().int().positive().max(999),
});

export async function createOrderAction(formData: FormData) {
  await requireCustomer();
  const supabase = await createSupabaseServerClient();
  const rawItems = String(formData.get("items") ?? "[]");
  const items = z.array(cartItemSchema).parse(JSON.parse(rawItems));
  const shippingAddress = String(formData.get("shipping_address_id") ?? "");
  const note = String(formData.get("customer_note") ?? "").trim();

  const { data, error } = await supabase.rpc("create_order", {
    items,
    shipping_address_id: shippingAddress || null,
    customer_note: note || null,
  });

  if (error) redirect(`/cart?error=${encodeURIComponent(error.message)}`);
  redirect(`/orders/${data}`);
}

export async function updateProfileAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim(),
      company_name: String(formData.get("company_name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      line_user_id: String(formData.get("line_user_id") ?? "").trim() || null,
    })
    .eq("id", profile.id);

  revalidatePath("/profile");
}

export async function saveAddressAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient();
  const addressId = String(formData.get("address_id") ?? "");
  const payload = {
    customer_id: profile.id,
    label: String(formData.get("label") ?? "Main address").trim(),
    recipient_name: String(formData.get("recipient_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address_line1: String(formData.get("address_line1") ?? "").trim(),
    address_line2: String(formData.get("address_line2") ?? "").trim() || null,
    district: String(formData.get("district") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    is_default: formData.get("is_default") === "on",
  };

  if (addressId) {
    await supabase.from("customer_addresses").update(payload).eq("id", addressId);
  } else {
    await supabase.from("customer_addresses").insert(payload);
  }

  revalidatePath("/profile");
}

export async function submitPaymentAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient();
  const file = formData.get("slip");
  const amount = Number(formData.get("amount") ?? 0);
  const transferDate = String(formData.get("transfer_date") ?? "") || null;
  const note = String(formData.get("customer_note") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    redirect("/payments/new?error=Payment slip is required");
  }

  const path = `${profile.id}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect(`/payments/new?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error } = await supabase.rpc("submit_payment", {
    amount,
    slip_path: path,
    transfer_date: transferDate,
    customer_note: note,
  });

  if (error) redirect(`/payments/new?error=${encodeURIComponent(error.message)}`);
  redirect("/transactions");
}
