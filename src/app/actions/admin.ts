"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/storage";
import type { OrderStatus, UserRole } from "@/lib/types";

async function uploadImageFile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
  folder: string,
  file: FormDataEntryValue | null,
  errorPath: string,
) {
  if (!(file instanceof File) || file.size === 0) return null;

  if (!file.type.startsWith("image/")) {
    redirect(`${errorPath}?error=${encodeURIComponent("Please upload an image file")}`);
  }

  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) redirect(`${errorPath}?error=${encodeURIComponent(error.message)}`);
  return path;
}

async function resolveProductCategoryId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  formData: FormData,
) {
  const newCategoryName = String(formData.get("new_category_name") ?? "").trim();
  if (newCategoryName) {
    const { data: existing, error: lookupError } = await supabase
      .from("product_categories")
      .select("id")
      .eq("name", newCategoryName)
      .maybeSingle();

    if (lookupError) redirect(`/admin/products?error=${encodeURIComponent(lookupError.message)}`);
    if (existing?.id) return existing.id as string;

    const { data: created, error: createError } = await supabase
      .from("product_categories")
      .insert({
        name: newCategoryName,
        description: String(formData.get("new_category_description") ?? "").trim() || null,
      })
      .select("id")
      .single();

    if (createError) redirect(`/admin/products?error=${encodeURIComponent(createError.message)}`);
    return created.id as string;
  }

  const selectedCategoryId = String(formData.get("category_id") ?? "").trim();
  return selectedCategoryId || null;
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(`/admin/products?error=${encodeURIComponent("กรุณากรอกชื่อหมวดหมู่")}`);
  }

  const { error } = await supabase.from("product_categories").insert({
    name,
    description: String(formData.get("description") ?? "").trim() || null,
  });

  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const id = String(formData.get("category_id") ?? "");

  if (!id) {
    redirect(`/admin/products?error=${encodeURIComponent("ไม่พบหมวดหมู่ที่ต้องการลบ")}`);
  }

  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id);

  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = await resolveProductCategoryId(supabase, formData);
  const imagePath = await uploadImageFile(
    supabase,
    "product-images",
    `products/${safeFileName(sku || "product")}`,
    formData.get("image"),
    "/admin/products",
  );

  const { error } = await supabase.rpc("create_product_with_inventory", {
    sku,
    name: String(formData.get("name") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    unit: String(formData.get("unit") ?? "piece").trim(),
    quantity_available: Number(formData.get("quantity_available") ?? 0),
    low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
    description: String(formData.get("description") ?? "").trim() || null,
    category_id: categoryId,
    image_path: imagePath,
  });

  if (error) {
    if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const id = String(formData.get("id") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  const imagePath = await uploadImageFile(
    supabase,
    "product-images",
    `products/${safeFileName(sku || id || "product")}`,
    formData.get("image"),
    "/admin/products",
  );

  const payload: {
    sku: string;
    name: string;
    price: number;
    unit: string;
    description: string | null;
    category_id: string | null;
    is_active: boolean;
    image_path?: string;
  } = {
    sku,
    name: String(formData.get("name") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    unit: String(formData.get("unit") ?? "piece").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    category_id: await resolveProductCategoryId(supabase, formData),
    is_active: formData.get("is_active") === "on",
  };

  if (imagePath) payload.image_path = imagePath;

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function adjustInventoryAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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

  if (error) {
    await supabase.storage.from("order-photos").remove([path]);
    redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/orders");
}

export async function approvePaymentAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
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
  const supabase = await createSupabaseServerClient("admin");
  const userId = String(formData.get("user_id") ?? "");
  const { error } = await supabase.rpc("suspend_customer", {
    target_user_id: userId,
  });
  if (error) redirect(`/admin/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/users");
}
