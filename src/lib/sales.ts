// Sales-dashboard date helpers and aggregation. "A sale" is an order whose
// debt has been applied (admin approved it); the sale date is debt_applied_at
// bucketed into Asia/Bangkok calendar days — the same convention the Price
// Program uses for monthly accumulation.

export type SalesOrder = {
  id: string;
  subtotal: number;
  debt_applied_at: string;
  order_items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    line_total: number;
    unit: string;
  }[];
};

const BKK_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD

/** Bangkok calendar date (YYYY-MM-DD) of a timestamp. */
export function bkkDateKey(value: string | Date = new Date()) {
  return BKK_DATE.format(typeof value === "string" ? new Date(value) : value);
}

/** UTC ISO timestamp of midnight (Bangkok) on the given YYYY-MM-DD. */
export function bkkStartOfDayISO(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+07:00`).toISOString();
}

/** dateKey + n days (Bangkok calendar). */
export function addDays(dateKey: string, n: number) {
  const d = new Date(`${dateKey}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return bkkDateKey(d);
}

export function isDateKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00+07:00`).getTime());
}

/** All Bangkok day keys from `from` to `to` inclusive (bounded to 366 days). */
export function dayKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  let cursor = from;
  for (let i = 0; i < 366 && cursor <= to; i++) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export type SalesSummary = {
  total: number;
  orders: number;
  pieces: number;
};

/** Sum orders whose Bangkok sale-day falls in [from, to]. */
export function summarize(orders: SalesOrder[], from: string, to: string): SalesSummary {
  let total = 0;
  let count = 0;
  let pieces = 0;
  for (const order of orders) {
    const day = bkkDateKey(order.debt_applied_at);
    if (day < from || day > to) continue;
    total += Number(order.subtotal);
    count += 1;
    for (const item of order.order_items) pieces += Number(item.quantity);
  }
  return { total, orders: count, pieces };
}

export type DailyPoint = { day: string; total: number; orders: number };

/** Per-day totals across [from, to], with zero-filled days. */
export function dailySeries(orders: SalesOrder[], from: string, to: string): DailyPoint[] {
  const buckets = new Map<string, DailyPoint>();
  for (const key of dayKeysBetween(from, to)) buckets.set(key, { day: key, total: 0, orders: 0 });
  for (const order of orders) {
    const day = bkkDateKey(order.debt_applied_at);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    bucket.total += Number(order.subtotal);
    bucket.orders += 1;
  }
  return [...buckets.values()];
}

export type TopProduct = { key: string; name: string; unit: string; quantity: number; revenue: number };

/** Top products by revenue within [from, to]. */
export function topProducts(orders: SalesOrder[], from: string, to: string, limit = 5): TopProduct[] {
  const byProduct = new Map<string, TopProduct>();
  for (const order of orders) {
    const day = bkkDateKey(order.debt_applied_at);
    if (day < from || day > to) continue;
    for (const item of order.order_items) {
      const key = item.product_id ?? item.product_name;
      const entry = byProduct.get(key) ?? { key, name: item.product_name, unit: item.unit, quantity: 0, revenue: 0 };
      entry.quantity += Number(item.quantity);
      entry.revenue += Number(item.line_total);
      byProduct.set(key, entry);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** Compact ฿ label for chart axes: ฿12.5K, ฿1.2M. */
export function moneyCompact(value: number) {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `฿${Math.round(value)}`;
}
