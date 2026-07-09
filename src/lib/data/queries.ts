import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthScope } from "@/lib/supabase/server";
import type { PriceProgramStatus } from "@/lib/types";

export async function getProductsWithInventory(
  includeInactive = false,
  scope: AuthScope = "customer",
) {
  const supabase = await createSupabaseServerClient(scope);
  let query = supabase
    .from("products")
    .select(
      "*, category:product_categories(id, name, description, sort_order, created_at), tiers:product_price_tiers(min_quantity, discount_amount), inventory(quantity_available, low_stock_threshold)",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProductCategories(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPriceProgramStatus(): Promise<PriceProgramStatus> {
  const supabase = await createSupabaseServerClient("customer");
  const { data, error } = await supabase.rpc("price_program_status");
  const fallback: PriceProgramStatus = {
    floor_quantity: 0,
    month_quantity: 0,
    rolling_floor_quantity: 0,
    locked_floor_quantity: 0,
  };
  if (error || !data) return fallback;
  return { ...fallback, ...(data as Partial<PriceProgramStatus>) };
}

// Per-product special discounts for the signed-in customer. Filter by the
// caller's id explicitly: RLS also allows staff/admin to read every row, so an
// admin browsing the customer side must not inherit other customers' discounts.
export async function getMyProductDiscounts() {
  const supabase = await createSupabaseServerClient("customer");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {} as Record<string, number>;

  const { data, error } = await supabase
    .from("customer_product_discounts")
    .select("product_id, discount_amount")
    .eq("customer_id", user.id);
  if (error) return {} as Record<string, number>;
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.product_id] = Number(row.discount_amount);
  return map;
}

export async function getCustomerAddresses() {
  const supabase = await createSupabaseServerClient("customer");
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerOrders() {
  const supabase = await createSupabaseServerClient("customer");
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrderDetail(id: string) {
  const supabase = await createSupabaseServerClient("customer");
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_photos(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getPayments(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  const { data, error } = await supabase
    .from("payments")
    .select("*, customer:profiles!payments_customer_id_fkey(full_name, company_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransactions(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  const { data, error } = await supabase
    .from("account_transactions")
    .select("*, orders(order_number), payments(payment_number)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminOrders() {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:profiles!orders_customer_id_fkey(full_name, company_name, email, phone, debt_balance), order_items(*), order_photos(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProfiles() {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminCustomerDetail(customerId: string) {
  const supabase = await createSupabaseServerClient("admin");
  const [profileResult, addressResult, ordersResult, paymentsResult, transactionsResult, productDiscountsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .eq("role", "customer")
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("account_transactions")
      .select("*, orders(order_number), payments(payment_number)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("customer_product_discounts")
      .select("*, product:products(id, name, sku, unit)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (addressResult.error) throw addressResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;
  if (productDiscountsResult.error) throw productDiscountsResult.error;

  return {
    profile: profileResult.data,
    addresses: addressResult.data ?? [],
    orders: ordersResult.data ?? [],
    payments: paymentsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
    productDiscounts: productDiscountsResult.data ?? [],
  };
}

export async function getInventoryMovements() {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, products(name, sku)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function getSettings() {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
