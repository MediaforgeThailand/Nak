import { addDays, bkkDateKey } from "@/lib/sales";

// Aggregation helpers for the admin report pages. Same conventions as the
// sales dashboard: a sale = approved order (debt_applied_at), bucketed into
// Asia/Bangkok calendar days, rejected/cancelled excluded at the query level.

export type RangePreset = { key: string; label: string; from: string; to: string };

/** Preset ranges for ?range= links; falls back to `fallbackKey` when unknown. */
export function resolveRange(param: string | undefined, fallbackKey = "30d") {
  const today = bkkDateKey();
  const monthStart = `${today.slice(0, 8)}01`;
  const presets: RangePreset[] = [
    { key: "7d", label: "7 วัน", from: addDays(today, -6), to: today },
    { key: "month", label: "เดือนนี้", from: monthStart, to: today },
    { key: "30d", label: "30 วัน", from: addDays(today, -29), to: today },
    { key: "90d", label: "90 วัน", from: addDays(today, -89), to: today },
  ];
  const active = presets.find((preset) => preset.key === param) ?? presets.find((preset) => preset.key === fallbackKey) ?? presets[0];
  return { today, presets, active };
}

// Supabase nests to-one joins as an object but types them loosely; normalize.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export type ReportOrderItem = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number;
  unit: string;
  product?: { category?: { name: string } | { name: string }[] | null } | { category?: { name: string } | { name: string }[] | null }[] | null;
};

export type ReportOrder = {
  id: string;
  subtotal: number;
  debt_applied_at: string;
  customer_id: string;
  customer?: { company_name: string | null; full_name: string | null; email: string | null } | { company_name: string | null; full_name: string | null; email: string | null }[] | null;
  order_items: ReportOrderItem[];
};

function inRange(order: ReportOrder, from: string, to: string) {
  const day = bkkDateKey(order.debt_applied_at);
  return day >= from && day <= to;
}

export function customerLabel(order: ReportOrder) {
  const customer = one(order.customer);
  return customer?.company_name || customer?.full_name || customer?.email || "ไม่ระบุชื่อ";
}

export type CustomerAgg = { key: string; name: string; revenue: number; orders: number; pieces: number };

/** Customers ranked by approved revenue within [from, to]. */
export function topCustomers(orders: ReportOrder[], from: string, to: string, limit = 8): CustomerAgg[] {
  const byCustomer = new Map<string, CustomerAgg>();
  for (const order of orders) {
    if (!inRange(order, from, to)) continue;
    const entry = byCustomer.get(order.customer_id) ?? {
      key: order.customer_id,
      name: customerLabel(order),
      revenue: 0,
      orders: 0,
      pieces: 0,
    };
    entry.revenue += Number(order.subtotal ?? 0);
    entry.orders += 1;
    for (const item of order.order_items) entry.pieces += Number(item.quantity ?? 0);
    byCustomer.set(order.customer_id, entry);
  }
  return [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export type CategoryAgg = { name: string; revenue: number; pieces: number };

/** Revenue per product category within [from, to], sorted descending. */
export function categoryBreakdown(orders: ReportOrder[], from: string, to: string): CategoryAgg[] {
  const byCategory = new Map<string, CategoryAgg>();
  for (const order of orders) {
    if (!inRange(order, from, to)) continue;
    for (const item of order.order_items) {
      const category = one(one(item.product)?.category);
      const name = category?.name || "ไม่ระบุหมวด";
      const entry = byCategory.get(name) ?? { name, revenue: 0, pieces: 0 };
      entry.revenue += Number(item.line_total ?? 0);
      entry.pieces += Number(item.quantity ?? 0);
      byCategory.set(name, entry);
    }
  }
  return [...byCategory.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Distinct products that sold at least one piece within [from, to]. */
export function soldProductIds(orders: ReportOrder[], from: string, to: string) {
  const ids = new Set<string>();
  for (const order of orders) {
    if (!inRange(order, from, to)) continue;
    for (const item of order.order_items) {
      if (item.product_id) ids.add(item.product_id);
    }
  }
  return ids;
}
