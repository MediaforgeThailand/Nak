import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getProductsWithInventory(includeInactive = false) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*, inventory(quantity_available, low_stock_threshold)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerAddresses() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrderDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_photos(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getPayments() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, profiles(full_name, company_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransactions() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_transactions")
    .select("*, orders(order_number), payments(payment_number)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, profiles(full_name, company_name, email), order_items(*), order_photos(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProfiles() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInventoryMovements() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, products(name, sku)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function getSettings() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
