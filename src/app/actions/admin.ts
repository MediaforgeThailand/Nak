"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireOwner, requireStaff } from "@/lib/auth";
import { getLineQuota, getLinkedGroupId, lineServiceClient, pushLineFlex } from "@/lib/line";
import { buildDailyBubble, buildPeriodBubble, gatherDaily, gatherPeriod } from "@/lib/line-report";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/storage";
import type { UserRole } from "@/lib/types";

const userRoles: UserRole[] = ["customer", "factory_staff", "admin"];

function adminReturnPath(formData: FormData, fallback: "/admin/customers" | "/admin/users") {
  const value = String(formData.get("return_to") ?? fallback);
  return value === "/admin/users" || value === "/admin/customers" ? value : fallback;
}

function customerReturnPath(formData: FormData) {
  const value = String(formData.get("return_to") ?? "/admin/customers");
  return value === "/admin/customers" || value.startsWith("/admin/customers/") ? value : "/admin/customers";
}

function withError(path: string, message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;
}

function parseUserRole(value: FormDataEntryValue | null) {
  const role = String(value ?? "customer") as UserRole;
  return userRoles.includes(role) ? role : null;
}

type ParsedTier = { min_quantity: number; discount_amount: number };

// Parse the "จำนวน=ส่วนลด per line" textarea into ladder rows. Tiers are
// discounts from the base price so the ladder survives base-price changes.
function parsePriceTiers(raw: string): { tiers: ParsedTier[] } | { error: string } {
  const tiers: ParsedTier[] = [];
  const seen = new Set<number>();

  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    const match = text.match(/^([\d,]+)\s*[=:\/]\s*([\d,]+(?:\.\d+)?)$/);
    if (!match) return { error: `รูปแบบไม่ถูกต้อง: "${text}" (ใช้ จำนวน=ส่วนลด เช่น 10=20)` };

    const minQuantity = Number(match[1].replace(/,/g, ""));
    const discountAmount = Number(match[2].replace(/,/g, ""));
    if (!Number.isInteger(minQuantity) || minQuantity < 1) return { error: `จำนวนขั้นต่ำไม่ถูกต้อง: "${text}"` };
    if (!Number.isFinite(discountAmount) || discountAmount < 0) return { error: `ส่วนลดไม่ถูกต้อง: "${text}"` };
    if (seen.has(minQuantity)) return { error: `จำนวน ${minQuantity} ซ้ำกัน` };

    seen.add(minQuantity);
    tiers.push({ min_quantity: minQuantity, discount_amount: discountAmount });
  }

  tiers.sort((a, b) => a.min_quantity - b.min_quantity);
  return { tiers };
}

// Replace the GLOBAL discount ladder (applies to every product).
export async function updatePriceTiersAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const parsed = parsePriceTiers(String(formData.get("price_tiers") ?? ""));

  if ("error" in parsed) redirect(`/admin/products?error=${encodeURIComponent(parsed.error)}`);
  if (parsed.tiers.length === 0) {
    redirect(`/admin/products?error=${encodeURIComponent("ต้องมีอย่างน้อย 1 ขั้น (เช่น 1=0)")}`);
  }

  const { error: deleteError } = await supabase.from("price_tiers").delete().gte("min_quantity", 1);
  if (deleteError) redirect(`/admin/products?error=${encodeURIComponent(deleteError.message)}`);

  const { error: insertError } = await supabase.from("price_tiers").insert(parsed.tiers);
  if (insertError) redirect(`/admin/products?error=${encodeURIComponent(insertError.message)}`);

  revalidatePath("/admin/products");
  revalidatePath("/home");
  revalidatePath("/cart");
  revalidatePath("/price-program");
}

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

async function uploadPaymentSlipFile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  folder: string,
  file: FormDataEntryValue | null,
  errorPath: string,
) {
  if (!(file instanceof File) || file.size === 0) return null;

  const isAllowed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf";

  if (!isAllowed) {
    redirect(`${errorPath}?error=${encodeURIComponent("Please upload an image or PDF slip")}`);
  }

  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("payment-slips").upload(path, buffer, {
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
  revalidatePath("/home");
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
  let oldImagePath: string | null = null;

  if (imagePath) {
    const { data: existingProduct, error: lookupError } = await supabase
      .from("products")
      .select("image_path")
      .eq("id", id)
      .maybeSingle<{ image_path: string | null }>();

    if (lookupError) {
      await supabase.storage.from("product-images").remove([imagePath]);
      redirect(`/admin/products?error=${encodeURIComponent(lookupError.message)}`);
    }

    oldImagePath = existingProduct?.image_path ?? null;
  }

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

  if (
    imagePath &&
    oldImagePath &&
    oldImagePath !== imagePath &&
    !oldImagePath.startsWith("/") &&
    !oldImagePath.startsWith("http://") &&
    !oldImagePath.startsWith("https://")
  ) {
    await supabase.storage.from("product-images").remove([oldImagePath]);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/home");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(`/admin/products?error=${encodeURIComponent("Product is required")}`);
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/home");
}

// Add-stock flow: quantity (positive = รับเข้า, negative = ปรับลด) with an
// optional goods-received photo kept on the movement for later review.
export async function addStockAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const productId = String(formData.get("product_id") ?? "");
  const delta = Number(formData.get("quantity_delta") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;

  const back = productId ? `/admin/stock/add?product=${productId}` : "/admin/stock/add";

  if (!productId) redirect(`/admin/stock/add?error=${encodeURIComponent("กรุณาเลือกสินค้า")}`);
  if (!Number.isInteger(delta) || delta === 0) {
    redirect(`${back}&error=${encodeURIComponent("จำนวนต้องเป็นจำนวนเต็มและไม่เท่ากับ 0")}`);
  }

  let photoPath: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    // Match the stock-photos bucket allowlist so the failure is a clear Thai
    // message instead of a raw Supabase rejection.
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      redirect(`${back}&error=${encodeURIComponent("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP เท่านั้น")}`);
    }
    const path = `receipts/${safeFileName(productId)}/${Date.now()}-${safeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("stock-photos").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) redirect(`${back}&error=${encodeURIComponent(uploadError.message)}`);
    photoPath = path;
  }

  const { error } = await supabase.rpc("adjust_inventory", {
    target_product_id: productId,
    quantity_delta: delta,
    note,
    photo_path: photoPath,
  });

  if (error) {
    if (photoPath) await supabase.storage.from("stock-photos").remove([photoPath]);
    redirect(`${back}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/stock");
  revalidatePath("/admin/home");
  revalidatePath("/products");
  revalidatePath("/home");
  redirect("/admin/stock?ok=1");
}

// Send a report flex card (daily/weekly/monthly per the "kind" form field) to
// the linked LINE staff group so admins can preview the report UI. Leaves the
// scheduled-report dedupe markers untouched, so the nightly 20:00 report still
// goes out as usual.
export async function testLineNotifyAction(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("kind") ?? "daily");
  const kind = raw === "weekly" || raw === "monthly" ? raw : "daily";
  const client = lineServiceClient();
  if (!client) {
    redirect(`/admin/settings?error=${encodeURIComponent("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์")}`);
  }
  const groupId = await getLinkedGroupId(client);
  if (!groupId) {
    redirect(`/admin/settings?error=${encodeURIComponent("ยังไม่ได้เชื่อมกลุ่ม — เพิ่ม OA เข้ากลุ่มทีมงาน แล้วพิมพ์ข้อความในกลุ่ม 1 ครั้ง")}`);
  }
  const quota = await getLineQuota();
  if (!quota) {
    redirect(`/admin/settings?error=${encodeURIComponent("เช็คโควต้า LINE ไม่ได้ — ยังไม่ส่งเพื่อความปลอดภัย ลองใหม่อีกครั้ง")}`);
  }
  const limit = Math.min(quota.limit ?? 195, 195);
  if (quota.used >= limit) {
    redirect(`/admin/settings?error=${encodeURIComponent(`โควต้าข้อความเดือนนี้เต็มแล้ว (${quota.used}/${limit})`)}`);
  }
  const bubble =
    kind === "daily"
      ? buildDailyBubble(await gatherDaily(client))
      : buildPeriodBubble(await gatherPeriod(client, kind));
  const push = await pushLineFlex(groupId, "ตัวอย่างรายงาน NAK Wholesale", bubble);
  if (!push.ok) {
    redirect(`/admin/settings?error=${encodeURIComponent(push.error ?? "ส่งไม่สำเร็จ")}`);
  }
  redirect("/admin/settings?ok=1");
}

export async function approveOrderAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const orderId = String(formData.get("order_id") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  const { error } = await supabase.rpc("approve_order_and_start_packing", {
    target_order_id: orderId,
    admin_note: note,
  });

  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/home");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/profile");
  revalidatePath("/transactions");
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
  revalidatePath("/admin/home");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/home");
}

export async function shipOrderWithPhotoAction(formData: FormData) {
  await requireStaff();
  const supabase = await createSupabaseServerClient("admin");
  const orderId = String(formData.get("order_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/orders?error=${encodeURIComponent("กรุณาถ่ายหรือแนบรูปสินค้าก่อนยืนยันจัดส่ง")}`);
  }

  if (!file.type.startsWith("image/")) {
    redirect(`/admin/orders?error=${encodeURIComponent("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น")}`);
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

  const { error } = await supabase.rpc("ship_order_with_photo", {
    target_order_id: orderId,
    storage_path: path,
    caption,
  });

  if (error) {
    await supabase.storage.from("order-photos").remove([path]);
    redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/home");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

// จัดส่ง stage (Flash only): staff handed the parcel to the courier.
export async function confirmHandoffAction(formData: FormData) {
  await requireStaff();
  const supabase = await createSupabaseServerClient("admin");
  const orderId = String(formData.get("order_id") ?? "");

  const { error } = await supabase.rpc("update_order_status", {
    target_order_id: orderId,
    new_status: "shipping",
    note: "ส่งให้ขนส่งแล้ว",
  });

  if (error) redirect(`/admin/orders?stage=handoff&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/home");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
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
  revalidatePath("/admin/customers");
  revalidatePath("/profile");
  revalidatePath("/transactions");
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
  revalidatePath("/profile");
  revalidatePath("/transactions");
}

export async function updateCustomerDiscountAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = customerReturnPath(formData);
  const userId = String(formData.get("user_id") ?? "");
  const discount = Number(formData.get("per_item_discount") ?? 0);

  if (!Number.isFinite(discount) || discount < 0) {
    redirect(withError(returnTo, "ส่วนลดต้องเป็น 0 หรือมากกว่า"));
  }

  const { error } = await supabase.rpc("admin_update_customer_discount", {
    target_customer_id: userId,
    discount_per_item: discount,
  });

  if (error) redirect(withError(returnTo, error.message));
  revalidatePath("/admin/customers");
  revalidatePath(returnTo);
  revalidatePath("/home");
  revalidatePath("/products");
  revalidatePath("/cart");
  revalidatePath("/profile");
}

export async function setCustomerPriceLockAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = customerReturnPath(formData);
  const userId = String(formData.get("user_id") ?? "");
  const lockedQuantity = Number(formData.get("locked_floor_quantity") ?? 0);

  if (!Number.isInteger(lockedQuantity) || lockedQuantity < 0) {
    redirect(withError(returnTo, "จำนวนล็อกต้องเป็นจำนวนเต็ม 0 หรือมากกว่า"));
  }

  const { error } = await supabase.rpc("admin_set_customer_price_lock", {
    target_customer_id: userId,
    locked_quantity: lockedQuantity,
  });

  if (error) redirect(withError(returnTo, error.message));
  revalidatePath("/admin/customers");
  revalidatePath(returnTo);
  revalidatePath("/home");
  revalidatePath("/products");
  revalidatePath("/cart");
  revalidatePath("/price-program");
}

export async function adjustCustomerDebtAction(formData: FormData) {
  await requireOwner();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = customerReturnPath(formData);
  const userId = String(formData.get("user_id") ?? "");
  const amountDelta = Number(formData.get("amount_delta") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isFinite(amountDelta) || amountDelta === 0) {
    redirect(withError(returnTo, "Manual adjustment amount cannot be zero"));
  }

  const { error } = await supabase.rpc("owner_adjust_customer_debt", {
    target_customer_id: userId,
    amount_delta: amountDelta,
    note,
  });

  if (error) redirect(withError(returnTo, error.message));
  revalidatePath("/admin/customers");
  revalidatePath(returnTo);
  revalidatePath("/profile");
  revalidatePath("/transactions");
}

export async function recordManualPaymentAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const customerId = String(formData.get("customer_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const transferDate = String(formData.get("transfer_date") ?? "") || null;
  const adminNote = String(formData.get("admin_note") ?? "").trim() || null;

  if (!customerId) {
    redirect(`/admin/payments?error=${encodeURIComponent("Please select a customer")}`);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/admin/payments?error=${encodeURIComponent("Payment amount must be greater than zero")}`);
  }

  const slipPath = await uploadPaymentSlipFile(
    supabase,
    `admin-manual/${safeFileName(customerId)}`,
    formData.get("slip"),
    "/admin/payments",
  );

  const { error } = await supabase.rpc("admin_record_manual_payment", {
    target_customer_id: customerId,
    amount,
    slip_path: slipPath,
    transfer_date: transferDate,
    admin_note: adminNote,
  });

  if (error) {
    if (slipPath) await supabase.storage.from("payment-slips").remove([slipPath]);
    redirect(`/admin/payments?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/customers");
  revalidatePath("/profile");
  revalidatePath("/transactions");
}

export async function upsertCustomerProductDiscountAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = customerReturnPath(formData);
  const customerId = String(formData.get("customer_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const amount = Number(formData.get("discount_amount") ?? 0);

  if (!customerId || !productId) redirect(withError(returnTo, "กรุณาเลือกสินค้า"));
  if (!Number.isFinite(amount) || amount < 0) redirect(withError(returnTo, "ส่วนลดต้องเป็น 0 หรือมากกว่า"));

  const { error } = await supabase
    .from("customer_product_discounts")
    .upsert(
      { customer_id: customerId, product_id: productId, discount_amount: amount },
      { onConflict: "customer_id,product_id" },
    );

  if (error) redirect(withError(returnTo, error.message));
  revalidatePath(returnTo);
  revalidatePath("/home");
  revalidatePath("/cart");
  revalidatePath("/price-program");
}

export async function deleteCustomerProductDiscountAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = customerReturnPath(formData);
  const discountId = String(formData.get("discount_id") ?? "");

  if (!discountId) redirect(withError(returnTo, "ไม่พบรายการส่วนลด"));

  const { error } = await supabase.from("customer_product_discounts").delete().eq("id", discountId);

  if (error) redirect(withError(returnTo, error.message));
  revalidatePath(returnTo);
  revalidatePath("/home");
  revalidatePath("/cart");
  revalidatePath("/price-program");
}

export async function approveUserAction(formData: FormData) {
  const { profile: currentProfile } = await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = adminReturnPath(formData, "/admin/users");
  const userId = String(formData.get("user_id") ?? "");
  const role = parseUserRole(formData.get("role"));

  if (!role) {
    redirect(`${returnTo}?error=${encodeURIComponent("กรุณาเลือกสิทธิ์ที่ถูกต้อง")}`);
  }

  if (!userId || userId === currentProfile.id) {
    redirect(`${returnTo}?error=${encodeURIComponent("ไม่สามารถแก้สิทธิ์บัญชีที่กำลังใช้งานอยู่")}`);
  }

  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, status, signup_scope")
    .eq("id", userId)
    .single<{ id: string; role: UserRole; status: string; signup_scope: string }>();

  if (targetError || !targetProfile) {
    redirect(`${returnTo}?error=${encodeURIComponent(targetError?.message ?? "ไม่พบบัญชีที่ต้องการแก้ไข")}`);
  }

  // Approved customers can only be promoted to staff via an explicit staff request
  // (signup_scope = "staff"), not accidentally from the customer management screens.
  const isStaffRequest = targetProfile.signup_scope === "staff";
  if (!isStaffRequest && targetProfile.role === "customer" && targetProfile.status !== "pending" && role !== "customer") {
    redirect(
      `${returnTo}?error=${encodeURIComponent(
        "บัญชีลูกค้าที่ใช้งานแล้วไม่สามารถเลื่อนเป็นทีมงานจากหน้าจัดการลูกค้าได้ ให้ใช้คำขอทีมงานใหม่",
      )}`,
    );
  }

  const { error } = await supabase.rpc("approve_customer", {
    target_user_id: userId,
    target_role: role,
  });

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/users");
}

export async function suspendUserAction(formData: FormData) {
  const { profile: currentProfile } = await requireAdmin();
  const supabase = await createSupabaseServerClient("admin");
  const returnTo = adminReturnPath(formData, "/admin/users");
  const userId = String(formData.get("user_id") ?? "");

  if (!userId || userId === currentProfile.id) {
    redirect(`${returnTo}?error=${encodeURIComponent("ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่")}`);
  }

  const { error } = await supabase.rpc("suspend_customer", {
    target_user_id: userId,
  });

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/users");
}
