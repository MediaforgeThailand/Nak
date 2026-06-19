"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/storage";
import type { OrderStatus, UserRole } from "@/lib/types";

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("create_product_with_inventory", {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    unit: String(formData.get("unit") ?? "piece").trim(),
    quantity_available: Number(formData.get("quantity_available") ?? 0),
    low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
    description: String(formData.get("description") ?? "").trim() || null,
    category_id: null,
    image_path: null,
  });

  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");

  await supabase
    .from("products")
    .update({
      sku: String(formData.get("sku") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      unit: String(formData.get("unit") ?? "piece").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function adjustInventoryAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const productId = String(formData.get("product_id") ?? "");
  const delta = Number(formData.get("quantity_delta") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase.rpc("adjust_inventory", {
    target_product_id: productId,
    quantity_delta: delta,
    note,
  });

  if (error) redirect(`/admin/stock?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/stock");
  revalidatePath("/products");
}

export async function approveOrderAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const orderId = String(formData.get("order_id") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  const { error } = await supabase.rpc("approve_order", {
    target_order_id: orderId,
    admin_note: note,
  });
  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
}

export async function rejectOrderAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const orderId = String(formData.get("order_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const { error } = await supabase.rpc("reject_order", {
    target_order_id: orderId,
    reason,
  });
  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "packing") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim() || null;
  const { error } = await supabase.rpc("update_order_status", {
    target_order_id: orderId,
    new_status: status,
    note,
  });
  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
}

export async function uploadOrderPhotoAction(formData: FormData) {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const orderId = String(formData.get("order_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/orders?error=${encodeURIComponent("Order photo is required")}`);
  }

  const path = `${orderId}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("order-photos")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect(`/admin/orders?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error } = await supabase.rpc("upload_order_photo", {
    target_order_id: orderId,
    storage_path: path,
    caption,
  });

  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
}

export async function approvePaymentAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const paymentId = String(formData.get("payment_id") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  const { error } = await supabase.rpc("approve_payment", {
    target_payment_id: paymentId,
    admin_note: note,
  });
  if (error) redirect(`/admin/payments?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/payments");
}

export async function rejectPaymentAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const paymentId = String(formData.get("payment_id") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  const { error } = await supabase.rpc("reject_payment", {
    target_payment_id: paymentId,
    admin_note: note,
  });
  if (error) redirect(`/admin/payments?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/payments");
}

export async function approveUserAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "customer") as UserRole;
  const { error } = await supabase.rpc("approve_customer", {
    target_user_id: userId,
    target_role: role,
  });
  if (error) redirect(`/admin/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/users");
}

export async function suspendUserAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const userId = String(formData.get("user_id") ?? "");
  const { error } = await supabase.rpc("suspend_customer", {
    target_user_id: userId,
  });
  if (error) redirect(`/admin/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/users");
}
