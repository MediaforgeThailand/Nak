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
      "*, category:product_categories(id, name, description, sort_order, created_at), inventory(quantity_available, low_stock_threshold)",
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

// Global discount ladder (applies to every product).
export async function getPriceTiers(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  const { data, error } = await supabase
    .from("price_tiers")
    .select("min_quantity, discount_amount")
    .order("min_quantity", { ascending: true });
  if (error) return [];
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

// Per-customer special discounts (now granted by CATEGORY) for the signed-in
// customer, expanded to a product_id → discount map so the catalog/cart keep
// their existing shape. Filter by the caller's id explicitly: RLS also allows
// staff/admin to read every row, so an admin browsing the customer side must
// not inherit other customers' discounts.
export async function getMyProductDiscounts() {
  const supabase = await createSupabaseServerClient("customer");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {} as Record<string, number>;

  const [catRes, prodRes] = await Promise.all([
    supabase.from("customer_category_discounts").select("category_id, discount_amount").eq("customer_id", user.id),
    supabase.from("products").select("id, category_id").eq("is_active", true),
  ]);
  if (catRes.error || prodRes.error) return {} as Record<string, number>;

  const byCategory = new Map<string, number>();
  for (const row of catRes.data ?? []) byCategory.set(row.category_id as string, Number(row.discount_amount));

  const map: Record<string, number> = {};
  for (const product of prodRes.data ?? []) {
    const discount = product.category_id ? byCategory.get(product.category_id as string) : undefined;
    if (discount && discount > 0) map[product.id as string] = discount;
  }
  return map;
}

// Customer-side reads filter by the signed-in user explicitly instead of
// relying on RLS alone: staff/admin RLS grants read-all, so an admin browsing
// the customer side must never see other customers' rows blended in.
async function requireUserId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function getCustomerAddresses() {
  const supabase = await createSupabaseServerClient("customer");
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerOrders() {
  const supabase = await createSupabaseServerClient("customer");
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order detail for the signed-in customer; null when missing or not theirs. */
export async function getOrderDetail(id: string) {
  if (!UUID_PATTERN.test(id)) return null;
  const supabase = await createSupabaseServerClient("customer");
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_photos(*)")
    .eq("id", id)
    .eq("customer_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPayments(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  let query = supabase
    .from("payments")
    .select("*, customer:profiles!payments_customer_id_fkey(full_name, company_name, email)")
    .order("created_at", { ascending: false });
  if (scope === "customer") query = query.eq("customer_id", await requireUserId(supabase));
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTransactions(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  let query = supabase
    .from("account_transactions")
    .select("*, orders(order_number), payments(payment_number)")
    .order("created_at", { ascending: false });
  if (scope === "customer") query = query.eq("customer_id", await requireUserId(supabase));
  const { data, error } = await query;
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
  const [profileResult, addressResult, ordersResult, paymentsResult, transactionsResult, categoryDiscountsResult, salesResult] = await Promise.all([
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
      .from("customer_category_discounts")
      .select("*, category:product_categories(id, name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    // Lifetime purchase total/count = all real sales (approved, not
    // rejected/cancelled) — NOT the 6-row recent list above, which would
    // undercount and would wrongly include voided orders.
    supabase
      .from("orders")
      .select("subtotal")
      .eq("customer_id", customerId)
      .not("debt_applied_at", "is", null)
      .not("status", "in", "(rejected,cancelled)"),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (addressResult.error) throw addressResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;
  if (categoryDiscountsResult.error) throw categoryDiscountsResult.error;
  if (salesResult.error) throw salesResult.error;

  const salesRows = salesResult.data ?? [];
  const salesTotal = salesRows.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0);

  return {
    profile: profileResult.data,
    addresses: addressResult.data ?? [],
    orders: ordersResult.data ?? [],
    payments: paymentsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
    categoryDiscounts: categoryDiscountsResult.data ?? [],
    salesTotal,
    salesCount: salesRows.length,
  };
}

// Page through a PostgREST query so results never silently stop at the default
// 1000-row cap (which, on an ascending sort, would drop the NEWEST sales — i.e.
// exactly the current period the reports care about).
async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const size = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < size) break;
  }
  return all;
}

// Approved sales (debt applied) since `sinceISO`, with line items for
// top-product breakdowns. Small shop volumes → aggregate in JS.
export async function getSalesOrders(sinceISO: string) {
  const supabase = await createSupabaseServerClient("admin");
  return fetchAllRows((from, to) =>
    supabase
      .from("orders")
      .select("id, subtotal, debt_applied_at, order_items(product_id, product_name, quantity, line_total, unit)")
      .not("debt_applied_at", "is", null)
      .gte("debt_applied_at", sinceISO)
      .not("status", "in", "(rejected,cancelled)")
      .order("debt_applied_at", { ascending: true })
      .range(from, to),
  );
}

// Approved sales since `sinceISO` with customer + category context, for the
// report pages (same "approved sale" definition as getSalesOrders).
export async function getReportSalesOrders(sinceISO: string) {
  const supabase = await createSupabaseServerClient("admin");
  return fetchAllRows((from, to) =>
    supabase
      .from("orders")
      .select(
        "id, subtotal, debt_applied_at, customer_id, customer:profiles!orders_customer_id_fkey(company_name, full_name, email), order_items(product_id, product_name, quantity, line_total, unit, product:products(category:product_categories(name)))",
      )
      .not("debt_applied_at", "is", null)
      .gte("debt_applied_at", sinceISO)
      .not("status", "in", "(rejected,cancelled)")
      .order("debt_applied_at", { ascending: true })
      .range(from, to),
  );
}

// Customers carrying debt, largest first.
export async function getDebtors() {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, email, phone, debt_balance")
    .eq("role", "customer")
    .gt("debt_balance", 0)
    .order("debt_balance", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getApprovedPaymentsSince(sinceISO: string) {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("payments")
    .select("amount, reviewed_at, customer_id")
    .eq("status", "approved")
    .gte("reviewed_at", sinceISO)
    .order("reviewed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Latest approved payment per customer (reduce in JS), for debtor rows.
// Callers must keep `customerIds` small (displayed rows only): the scan is
// unbounded in time and PostgREST silently truncates at its max-rows cap.
export async function getLastApprovedPayments(customerIds: string[]) {
  if (customerIds.length === 0) return new Map<string, { reviewed_at: string; amount: number }>();
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("payments")
    .select("customer_id, reviewed_at, amount")
    .eq("status", "approved")
    .in("customer_id", customerIds)
    .order("reviewed_at", { ascending: false });
  if (error) throw error;
  const latest = new Map<string, { reviewed_at: string; amount: number }>();
  for (const payment of data ?? []) {
    if (!latest.has(payment.customer_id)) {
      latest.set(payment.customer_id, { reviewed_at: payment.reviewed_at, amount: Number(payment.amount ?? 0) });
    }
  }
  return latest;
}

export async function getPendingSlipCount() {
  const supabase = await createSupabaseServerClient("admin");
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

// Newest N orders with just the columns the dashboard feed renders — no
// order_items/order_photos joins, so the home page doesn't drag the whole
// order history to show five rows.
type RecentOrder = {
  id: string;
  order_number: string;
  subtotal: number;
  status: string;
  customer_id: string;
  customer: { company_name: string | null; full_name: string | null; email: string } | null;
};

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, subtotal, status, customer_id, customer:profiles!orders_customer_id_fkey(company_name, full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  // The customer FK embed is to-one at runtime; postgrest-js mistypes it as an array.
  return (data ?? []) as unknown as RecentOrder[];
}

// Sidebar badge counts — head-only counts (no rows/joins transferred), so the
// admin layout doesn't pull whole tables just to show three numbers.
export async function getAdminBadgeCounts() {
  const supabase = await createSupabaseServerClient("admin");
  const [orders, payments, users] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_admin"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (orders.error) throw orders.error;
  if (payments.error) throw payments.error;
  if (users.error) throw users.error;
  return { orders: orders.count ?? 0, payments: payments.count ?? 0, users: users.count ?? 0 };
}

export async function getStockMovementsSince(sinceISO: string) {
  const supabase = await createSupabaseServerClient("admin");
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("type, quantity_delta, created_at")
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getNewCustomerCount(sinceISO: string) {
  const supabase = await createSupabaseServerClient("admin");
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "customer")
    .gte("created_at", sinceISO);
  if (error) throw error;
  return count ?? 0;
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

// Shop receiving-account details for the customer payment page. Customers may
// read only this app_settings key (dedicated RLS policy); staff/admin read all.
export type PaymentBankAccount = { bank: string; accountNumber: string; accountName: string };

export async function getPaymentBankAccount(scope: AuthScope = "customer"): Promise<PaymentBankAccount | null> {
  const supabase = await createSupabaseServerClient(scope);
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "payment_bank_account")
    .maybeSingle<{ value: { bank?: string; account_number?: string; account_name?: string } | null }>();
  const accountNumber = data?.value?.account_number?.trim() ?? "";
  if (!accountNumber) return null;
  return {
    bank: data?.value?.bank?.trim() ?? "",
    accountNumber,
    accountName: data?.value?.account_name?.trim() ?? "",
  };
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
