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
    pending_admin: "รอแอดมินอนุมัติ",
    approved: "อนุมัติแล้ว",
    packing: "กำลังแพ็ค",
    ready_to_ship: "พร้อมส่ง",
    shipping: "กำลังจัดส่ง",
    delivered: "จัดส่งสำเร็จ",
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
