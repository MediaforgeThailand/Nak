"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { thaiDbError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/storage";

const cartItemSchema = z.object({
  product_id: z.uuid(),
  // Wholesale line quantities can be large; the cart already clamps to available
  // stock. Keep a sane upper bound just to reject absurd/garbage values.
  quantity: z.coerce.number().int().positive().max(100000),
});

export async function createOrderAction(formData: FormData) {
  await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
  const rawItems = String(formData.get("items") ?? "[]");
  let items: z.infer<typeof cartItemSchema>[];
  try {
    items = z.array(cartItemSchema).parse(JSON.parse(rawItems));
  } catch {
    // Malformed / oversized cart payload — show a Thai message instead of the
    // generic Next.js error page.
    redirect(`/cart?error=${encodeURIComponent("ตะกร้าไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")}`);
  }
  const shippingAddress = String(formData.get("shipping_address_id") ?? "");
  const note = String(formData.get("customer_note") ?? "").trim();
  const shippingMethod = formData.get("shipping_method") === "grab" ? "grab" : "flash";

  const { data, error } = await supabase.rpc("create_order", {
    items,
    shipping_address_id: shippingAddress || null,
    customer_note: note || null,
    shipping_method: shippingMethod,
  });

  if (error) redirect(`/cart?error=${encodeURIComponent(thaiDbError(error.message))}`);
  redirect(`/orders/${data}?ordered=1`);
}

export async function updateProfileAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
  const payload = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    company_name: String(formData.get("company_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profile.id);

  if (error) redirect(`/profile?error=${encodeURIComponent(thaiDbError(error.message))}`);
  revalidatePath("/profile");
  redirect("/profile?saved=profile");
}

export async function saveAddressAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
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

  if (!payload.recipient_name || !payload.address_line1) {
    redirect(`/profile?error=${encodeURIComponent("กรุณากรอกชื่อผู้รับและที่อยู่")}`);
  }

  // Save first, then demote the other defaults — never clear defaults before
  // the write succeeds, or a failed save would leave the customer with none.
  const { data: saved, error } = addressId
    ? await supabase
        .from("customer_addresses")
        .update(payload)
        .eq("id", addressId)
        .eq("customer_id", profile.id)
        .select("id")
    : await supabase.from("customer_addresses").insert(payload).select("id");

  if (error) redirect(`/profile?error=${encodeURIComponent(thaiDbError(error.message))}`);
  if (!saved || saved.length === 0) {
    redirect(`/profile?error=${encodeURIComponent("ไม่พบที่อยู่ที่ต้องการแก้ไข")}`);
  }

  if (payload.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", profile.id)
      .eq("is_default", true)
      .neq("id", saved[0].id);
  }

  revalidatePath("/profile");
  revalidatePath("/cart");
  redirect("/profile?saved=address");
}

export async function deleteAddressAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
  const addressId = String(formData.get("address_id") ?? "");

  if (!addressId) redirect(`/profile?error=${encodeURIComponent("ไม่พบที่อยู่ที่ต้องการลบ")}`);

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", profile.id);

  if (error) redirect(`/profile?error=${encodeURIComponent(thaiDbError(error.message))}`);

  // If the default was deleted, promote the newest remaining address.
  const { data: remaining } = await supabase
    .from("customer_addresses")
    .select("id, is_default")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });
  if (remaining && remaining.length > 0 && !remaining.some((a) => a.is_default)) {
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", remaining[0].id);
  }

  revalidatePath("/profile");
  revalidatePath("/cart");
  redirect("/profile?saved=address-deleted");
}

export async function setDefaultAddressAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
  const addressId = String(formData.get("address_id") ?? "");

  if (!addressId) redirect(`/profile?error=${encodeURIComponent("ไม่พบที่อยู่ที่เลือก")}`);

  // Promote first and confirm the row exists (it may have been deleted in
  // another tab); only then demote the others — never end with zero defaults.
  const { data: promoted, error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", profile.id)
    .select("id");

  if (error) redirect(`/profile?error=${encodeURIComponent(thaiDbError(error.message))}`);
  if (!promoted || promoted.length === 0) {
    redirect(`/profile?error=${encodeURIComponent("ไม่พบที่อยู่ที่เลือก (อาจถูกลบไปแล้ว)")}`);
  }

  await supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", profile.id)
    .eq("is_default", true)
    .neq("id", addressId);

  revalidatePath("/profile");
  revalidatePath("/cart");
  redirect("/profile?saved=address");
}

export async function submitPaymentAction(formData: FormData) {
  const { profile } = await requireCustomer();
  const supabase = await createSupabaseServerClient("customer");
  const file = formData.get("slip");
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  const transferDate = String(formData.get("transfer_date") ?? "") || null;
  const note = String(formData.get("customer_note") ?? "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/payments/new?error=${encodeURIComponent("ยอดโอนต้องเป็นตัวเลขมากกว่า 0 บาท")}`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/payments/new?error=${encodeURIComponent("กรุณาแนบสลิปโอนเงิน")}`);
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
    redirect(`/payments/new?error=${encodeURIComponent(thaiDbError(uploadError.message))}`);
  }

  const { error } = await supabase.rpc("submit_payment", {
    amount,
    slip_path: path,
    transfer_date: transferDate,
    customer_note: note,
  });

  if (error) {
    await supabase.storage.from("payment-slips").remove([path]);
    redirect(`/payments/new?error=${encodeURIComponent(thaiDbError(error.message))}`);
  }
  redirect("/profile?paid=1");
}
