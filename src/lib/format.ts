import type { AccountStatus, UserRole } from "@/lib/types";

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  // Whole amounts render without ".00" (฿300, ฿1,845); satang shows only when present.
  const hasSatang = Math.abs(amount % 1) >= 0.005;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: hasSatang ? 2 : 0,
  }).format(amount);
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function compactDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_admin: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    packing: "กำลังเตรียมจัดส่ง",
    ready_to_ship: "กำลังเตรียมจัดส่ง",
    shipping: "จัดส่งแล้ว",
    delivered: "จัดส่งแล้ว",
    rejected: "ถูกปฏิเสธ",
    cancelled: "ยกเลิก",
  };
  return labels[status] ?? status;
}

export type OrderStatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type OrderStatusMeta = {
  label: string;
  tone: OrderStatusTone;
  icon: string;
  step: number; // 0..2 along [รออนุมัติ → กำลังจัดส่ง → จัดส่งแล้ว], -1 when rejected/cancelled
};

// Maps the real order lifecycle onto the 3-step progress used in the redesign.
export function orderStatusMeta(status: string): OrderStatusMeta {
  const meta: Record<string, OrderStatusMeta> = {
    pending_admin: { label: "รออนุมัติ", tone: "warning", icon: "clock", step: 0 },
    approved: { label: "กำลังจัดส่ง", tone: "accent", icon: "truck", step: 1 },
    packing: { label: "กำลังจัดส่ง", tone: "accent", icon: "truck", step: 1 },
    ready_to_ship: { label: "กำลังจัดส่ง", tone: "accent", icon: "truck", step: 1 },
    shipping: { label: "จัดส่งแล้ว", tone: "success", icon: "checkCircle", step: 2 },
    delivered: { label: "จัดส่งแล้ว", tone: "success", icon: "checkCircle", step: 2 },
    rejected: { label: "ถูกปฏิเสธ", tone: "danger", icon: "xCircle", step: -1 },
    cancelled: { label: "ยกเลิก", tone: "danger", icon: "xCircle", step: -1 },
  };
  return meta[status] ?? meta.pending_admin;
}

export function shippingMethodLabel(method: string | null | undefined) {
  return method === "grab" ? "Grab" : "Flash Express";
}

export function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "รอตรวจสลิป",
    approved: "อนุมัติแล้ว",
    rejected: "ถูกปฏิเสธ",
  };
  return labels[status] ?? status;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  order_debt: "เพิ่มยอดจากออเดอร์",
  payment_credit: "ชำระเงิน",
  manual_adjustment: "ปรับยอดด้วยมือ",
  order_reversal: "คืนยอดออเดอร์",
};

// Account-transaction notes from the RPCs are stored in English. Show a Thai
// label by type to customers/staff, but keep owner-written manual-adjustment
// notes (often Thai and more specific) when present.
export function transactionLabel(type: string, note?: string | null) {
  if (type === "manual_adjustment" && note && note.trim()) return note.trim();
  return TRANSACTION_TYPE_LABELS[type] ?? note ?? type;
}

export function roleLabel(role: UserRole | string | null | undefined) {
  const labels: Record<UserRole, string> = {
    admin: "ผู้ดูแลระบบ",
    factory_staff: "ทีมจัดสินค้า",
    customer: "ลูกค้า",
  };
  return role && role in labels ? labels[role as UserRole] : "ไม่ระบุสิทธิ์";
}

export function accountStatusLabel(status: AccountStatus | string | null | undefined) {
  const labels: Record<AccountStatus, string> = {
    pending: "รออนุมัติ",
    approved: "ใช้งานได้",
    suspended: "ระงับการใช้งาน",
  };
  return status && status in labels ? labels[status as AccountStatus] : "ไม่ระบุสถานะ";
}
