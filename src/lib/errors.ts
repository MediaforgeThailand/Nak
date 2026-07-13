// Map English RPC/Postgres error messages (raised in supabase/migrations) to
// Thai before they reach the UI. Server actions pass error.message through
// this so customers and staff never see raw English database text.

const exactMap: Record<string, string> = {
  "Only approved customers can create orders": "บัญชีนี้ยังสั่งซื้อไม่ได้ (ต้องเป็นลูกค้าที่อนุมัติแล้ว)",
  "Only approved customers can submit payments": "บัญชีนี้ยังแจ้งชำระไม่ได้ (ต้องเป็นลูกค้าที่อนุมัติแล้ว)",
  "Order items are required": "ไม่มีสินค้าในตะกร้า",
  "Shipping address not found": "ไม่พบที่อยู่จัดส่ง กรุณาเลือกหรือเพิ่มที่อยู่ใหม่",
  "Invalid quantity": "จำนวนสินค้าไม่ถูกต้อง",
  "Product is not available": "มีสินค้าบางรายการปิดการขายแล้ว กรุณาลบออกจากตะกร้า",
  "Inventory record missing": "ข้อมูลสต็อกสินค้าไม่สมบูรณ์ กรุณาติดต่อร้าน",
  "Payment amount must be greater than zero": "ยอดโอนต้องเป็นตัวเลขมากกว่า 0 บาท",
  "Payment slip is required": "กรุณาแนบสลิปโอนเงิน",
  "Payment slip path is invalid": "ไฟล์สลิปไม่ถูกต้อง กรุณาอัปโหลดใหม่",
  "Order not found": "ไม่พบออเดอร์นี้",
  "Payment not found": "ไม่พบรายการชำระเงินนี้",
  "Customer not found": "ไม่พบบัญชีลูกค้านี้",
  "Approved customer not found": "ไม่พบลูกค้าที่อนุมัติแล้วตามที่เลือก",
  "Only pending orders can be approved": "ออเดอร์นี้ไม่ได้อยู่ในสถานะรออนุมัติแล้ว (อาจถูกจัดการไปแล้ว)",
  "Only pending orders can be rejected": "ออเดอร์นี้ไม่ได้อยู่ในสถานะรออนุมัติแล้ว (อาจถูกจัดการไปแล้ว)",
  "Only pending payments can be approved": "รายการนี้ถูกตรวจไปแล้ว",
  "Only pending payments can be rejected": "รายการนี้ถูกตรวจไปแล้ว",
  "Order status cannot be changed from current state": "สถานะออเดอร์นี้เปลี่ยนไม่ได้แล้ว",
  "Order status can only move forward": "สถานะออเดอร์ย้อนกลับไม่ได้",
  "Use approval or rejection flows for this status": "สถานะนี้ต้องใช้ปุ่มอนุมัติ/ปฏิเสธเท่านั้น",
  "Packed product photo is required before shipping": "ต้องแนบรูปสินค้าที่แพ็กแล้วก่อนยืนยันจัดส่ง",
  "Adjustment quantity cannot be zero": "จำนวนปรับสต็อกต้องไม่เท่ากับ 0",
  "Inventory cannot become negative": "ปรับลดไม่ได้ — สต็อกจะติดลบ",
  "Adjustment amount cannot be zero": "ยอดปรับต้องไม่เท่ากับ 0",
  "Adjustment does not change the customer balance": "ยอดปรับไม่ทำให้ยอดหนี้เปลี่ยน (ยอดหนี้ติดลบไม่ได้)",
  "Discount must be zero or greater": "ส่วนลดต้องเป็น 0 หรือมากกว่า",
  "Locked quantity must be zero or greater": "จำนวนล็อกต้องเป็น 0 หรือมากกว่า",
  "Cancellation reason is required": "กรุณาระบุเหตุผลการยกเลิกออเดอร์",
  "Only approved orders that have not shipped can be cancelled":
    "ยกเลิกได้เฉพาะออเดอร์ที่อนุมัติแล้วและยังไม่ได้จัดส่ง",
  "At least one price tier is required": "ต้องมีอย่างน้อย 1 ขั้นราคา (เช่น 1=0)",
  "Tier minimum quantity must be at least 1": "จำนวนขั้นต่ำของขั้นราคาต้องอย่างน้อย 1",
  "Tier discount must be zero or greater": "ส่วนลดของขั้นราคาต้องเป็น 0 หรือมากกว่า",
  "Cannot remove your own owner rights": "ถอนสิทธิ์เจ้าของของตัวเองไม่ได้",
  "Target must be an approved admin account": "บัญชีปลายทางต้องเป็นแอดมินที่อนุมัติแล้ว",
  "Only customer accounts can request staff access": "เฉพาะบัญชีลูกค้าเท่านั้นที่ขอสิทธิ์ทีมงานได้",
  "Cannot suspend the shop owner": "ระงับบัญชีเจ้าของไม่ได้ — ต้องโอนสิทธิ์เจ้าของให้บัญชีอื่นก่อน",
  "Cannot change the owner account": "แก้สิทธิ์บัญชีเจ้าของไม่ได้ — ต้องโอนสิทธิ์เจ้าของให้บัญชีอื่นก่อน",
  "Cannot delete your own account": "ลบบัญชีที่กำลังใช้งานอยู่ไม่ได้",
  "Cannot delete the shop owner": "ลบบัญชีเจ้าของไม่ได้",
  "Not authenticated": "กรุณาเข้าสู่ระบบใหม่",
};

const patternMap: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Insufficient stock for (.+)$/, (m) => `สต็อกไม่พอสำหรับ "${m[1]}" — กรุณาลดจำนวนหรือติดต่อร้าน`],
  [/^Only admins can .+$/, () => "ต้องใช้บัญชีแอดมินเท่านั้น"],
  [/^Only staff can .+$/, () => "ต้องใช้บัญชีทีมงานเท่านั้น"],
  [/^Only owners can .+$/, () => "ต้องใช้บัญชีเจ้าของร้านเท่านั้น"],
  [/^Only the owner can .+$/, () => "ต้องใช้บัญชีเจ้าของร้านเท่านั้น"],
];

/** Translate a known DB/RPC error message to Thai; unknown messages get a Thai prefix. */
export function thaiDbError(message: string | null | undefined): string {
  const text = (message ?? "").trim();
  if (!text) return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  if (exactMap[text]) return exactMap[text];
  for (const [pattern, render] of patternMap) {
    const match = text.match(pattern);
    if (match) return render(match);
  }
  // Unknown/unmapped errors: never echo the raw English/SQL text to users.
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
