import type { AccountStatus, UserRole } from "@/lib/types";

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
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

export function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "รอตรวจสลิป",
    approved: "อนุมัติแล้ว",
    rejected: "ถูกปฏิเสธ",
  };
  return labels[status] ?? status;
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
