import { notFound } from "next/navigation";
import {
  adjustCustomerDebtAction,
  deleteCustomerCategoryDiscountAction,
  deleteUserAction,
  setCustomerPriceLockAction,
  updateCustomerDiscountAction,
  upsertCustomerCategoryDiscountAction,
} from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { AdBadge, Avatar, BackHead, InfoRow, MiniStat, NakField, SectionCard } from "@/components/nak/ui";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCustomerDetail, getPriceTiers, getProductCategories } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, money, orderStatusLabel, paymentStatusLabel, transactionLabel } from "@/lib/format";
import { levelForQty, sortedTiers } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type CustomerDetail = Awaited<ReturnType<typeof getAdminCustomerDetail>>;

// PostgREST can type a to-one embed as an array, so accept either shape.
type CategoryDiscountRow = {
  id: string;
  discount_amount: number;
  category: { id: string; name: string } | { id: string; name: string }[] | null;
};

function displayName(profile: NonNullable<CustomerDetail["profile"]>) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const [query, { profile: adminProfile }, categories, globalTiers, detail] = await Promise.all([
    searchParams,
    requireAdmin(),
    getProductCategories("admin"),
    getPriceTiers("admin"),
    getAdminCustomerDetail(id),
  ]);
  const { profile, addresses, orders, payments, transactions, categoryDiscounts, salesTotal, salesCount } = detail;
  if (!profile) notFound();

  const canAdjustDebt = adminProfile.is_owner;
  const returnTo = `/admin/customers/${profile.id}`;
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];

  // Price-level lock: the picker mirrors the ONE global discount ladder every
  // product shares (price_tiers). The lock is a quantity floor applied to that
  // ladder, so a locked customer never drops below the chosen tier.
  const priceTiers = sortedTiers(globalTiers);
  const lockedQuantity = Number(profile.locked_floor_quantity ?? 0);
  const lockedLevel = lockedQuantity > 0 ? levelForQty(priceTiers, lockedQuantity) : 0;
  const lockMatchesTier = priceTiers.some((tier) => tier.min_quantity === lockedQuantity);

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <BackHead
        title="รายละเอียดลูกค้า"
        backHref="/admin/customers"
        right={
          <AdBadge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
            {accountStatusLabel(profile.status)}
          </AdBadge>
        }
      />

        {query.error ? (
          <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
            {query.error}
          </div>
        ) : null}

        <div className="ad-card" style={{ padding: 16, display: "grid", gap: 15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={displayName(profile)} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{displayName(profile)}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {profile.full_name ?? "—"} · {profile.phone ?? "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <MiniStat label="ยอดค้าง" value={money(profile.debt_balance)} tone="warn" />
            <MiniStat label="ซื้อทั้งหมด" value={money(salesTotal)} />
            <MiniStat label="ออเดอร์" value={String(salesCount)} />
            <MiniStat label="ส่วนลด/ชิ้น" value={Number(profile.per_item_discount ?? 0) > 0 ? money(profile.per_item_discount) : "—"} tone="ok" />
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            <InfoRow icon="mail" label="อีเมล" value={profile.email || "—"} />
            <InfoRow icon="building" label="บริษัท / ร้านค้า" value={profile.company_name || "—"} last />
          </div>
        </div>

        <SectionCard title="ปรับส่วนลดต่อชิ้น (ทุกสินค้า)" icon="percent">
          <form action={updateCustomerDiscountAction} style={{ display: "grid", gap: 10, marginTop: 4 }}>
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <NakField label="ส่วนลดต่อชิ้น (บาท)">
              <Input name="per_item_discount" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={Number(profile.per_item_discount ?? 0)} />
            </NakField>
            <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
              บันทึกส่วนลด
            </SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="ล็อกระดับราคา" icon="trending">
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              padding: "9px 11px",
              borderRadius: 10,
              marginBottom: 10,
              background: lockedQuantity > 0 ? "var(--p-soft)" : "var(--surface)",
              border: `1px solid ${lockedQuantity > 0 ? "var(--p)" : "var(--line)"}`,
              color: lockedQuantity > 0 ? "var(--p-deep)" : "var(--muted)",
            }}
          >
            {lockedQuantity > 0 ? (
              <>
                <Icon name="shield" size={13} stroke={2.4} style={{ verticalAlign: -2 }} />{" "}
                ล็อกไว้ที่{lockedLevel > 0 ? ` Lv.${lockedLevel}` : ""} (ตั้งแต่ {lockedQuantity.toLocaleString("th-TH")} ชิ้นขึ้นไป) —
                ลูกค้าได้ส่วนลดระดับนี้ทุกออเดอร์ ไม่หลุดแม้ยอดสะสมไม่ถึง
              </>
            ) : (
              "ยังไม่ได้ล็อก — ราคาเป็นไปตามยอดสะสม 2 เดือนล่าสุดตามปกติ"
            )}
          </div>
          <form action={setCustomerPriceLockAction} style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            {priceTiers.length > 0 ? (
              <NakField
                label="ระดับที่ล็อก"
                hint="อ้างอิงตารางส่วนลดรวม (ทุกสินค้า) · เป็นพื้นขั้นต่ำ ถ้าลูกค้าซื้อถึงขั้นสูงกว่าก็ยังได้ขั้นสูงกว่า"
              >
                <Select name="locked_floor_quantity" defaultValue={String(lockedQuantity)}>
                  <option value="0">ไม่ล็อก (ให้เป็นไปตามยอดสะสม)</option>
                  {priceTiers.map((tier, i) => (
                    <option key={tier.min_quantity} value={String(tier.min_quantity)}>
                      Lv.{i + 1} · ตั้งแต่ {tier.min_quantity.toLocaleString("th-TH")} ชิ้นขึ้นไป
                      {Number(tier.discount_amount) > 0 ? ` (ลด ${money(tier.discount_amount)}/ชิ้น)` : ""}
                    </option>
                  ))}
                  {lockedQuantity > 0 && !lockMatchesTier ? (
                    <option value={String(lockedQuantity)}>กำหนดเอง · {lockedQuantity.toLocaleString("th-TH")} ชิ้น</option>
                  ) : null}
                </Select>
              </NakField>
            ) : (
              <NakField label="จำนวนล็อกขั้นต่ำ (ชิ้น)" hint="ใส่ 0 = ไม่ล็อก · เป็นพื้นราคาขั้นต่ำตามตารางส่วนลดรวม">
                <Input
                  name="locked_floor_quantity"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  defaultValue={lockedQuantity}
                />
              </NakField>
            )}
            <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
              บันทึกการล็อกระดับ
            </SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="ส่วนลดพิเศษรายหมวดหมู่" icon="star">
          {categoryDiscounts.length > 0 ? (
            <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
              {categoryDiscounts.map((row: CategoryDiscountRow) => {
                const category = Array.isArray(row.category) ? row.category[0] : row.category;
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {category?.name ?? "หมวดหมู่ถูกลบ"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>ทุกสินค้าในหมวดนี้</div>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: "#1b7a4b", whiteSpace: "nowrap" }}>
                      -{money(row.discount_amount)}/ชิ้น
                    </span>
                    <form action={deleteCustomerCategoryDiscountAction}>
                      <input type="hidden" name="discount_id" value={row.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button
                        type="submit"
                        aria-label="ลบส่วนลด"
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: "transparent",
                          color: "#b42318",
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="trash" size={13} stroke={2.2} />
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0" }}>ยังไม่มีส่วนลดรายหมวดหมู่</p>
          )}

          <form action={upsertCustomerCategoryDiscountAction} style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input type="hidden" name="customer_id" value={profile.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <NakField label="หมวดหมู่">
              <Select name="category_id" required>
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </NakField>
            <NakField label="ส่วนลดเพิ่มต่อชิ้น (บาท)" hint="ลดเพิ่มทุกสินค้าในหมวดที่เลือก · ซ้อนกับส่วนลดขั้นบันไดและส่วนลดทุกสินค้า · เลือกหมวดซ้ำ = แก้ยอดเดิม">
              <Input name="discount_amount" type="number" inputMode="decimal" min="0" step="0.01" required />
            </NakField>
            <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
              เพิ่ม / แก้ไขส่วนลดหมวดหมู่
            </SubmitButton>
          </form>
        </SectionCard>

        {canAdjustDebt ? (
          <SectionCard title="ปรับยอดหนี้ (เจ้าของระบบ)" icon="wallet">
            <form action={adjustCustomerDebtAction} style={{ display: "grid", gap: 10, marginTop: 4 }}>
              <input type="hidden" name="user_id" value={profile.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <NakField label="จำนวน (+ เพิ่มหนี้ / - ลดหนี้)">
                <Input name="amount_delta" type="number" inputMode="decimal" step="0.01" placeholder="500 หรือ -500" />
              </NakField>
              <NakField label="หมายเหตุ">
                <Textarea name="note" required />
              </NakField>
              <SubmitButton variant="secondary" pendingLabel="กำลังปรับยอด...">
                บันทึกยอด
              </SubmitButton>
            </form>
          </SectionCard>
        ) : null}

        {defaultAddress ? (
          <SectionCard title="ที่อยู่จัดส่ง" icon="pin">
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>
              <div style={{ color: "var(--ink)", fontWeight: 600 }}>
                {defaultAddress.recipient_name} · {defaultAddress.phone || "—"}
              </div>
              <div>
                {[defaultAddress.address_line1, defaultAddress.district, defaultAddress.province, defaultAddress.postal_code]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="ออเดอร์ล่าสุด" icon="clipboard">
          {orders.map((order, i) => (
            <div
              key={order.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: i < orders.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.order_number}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {compactDate(order.created_at)} · {orderStatusLabel(order.status)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{money(order.subtotal)}</span>
            </div>
          ))}
          {orders.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีออเดอร์</p> : null}
        </SectionCard>

        <SectionCard title="ชำระเงินล่าสุด" icon="card">
          {payments.map((payment, i) => (
            <div
              key={payment.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: i < payments.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{payment.payment_number}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {compactDate(payment.created_at)} · {paymentStatusLabel(payment.status)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1b7a4b" }}>{money(payment.amount)}</span>
            </div>
          ))}
          {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีการชำระเงิน</p> : null}
        </SectionCard>

        <SectionCard title="ธุรกรรมล่าสุด" icon="receipt">
          {transactions.map((tx, i) => (
            <div key={tx.id} style={{ padding: "10px 0", borderBottom: i < transactions.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{transactionLabel(tx.type, tx.note)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(tx.created_at)}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{money(tx.amount)}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>ยอดหลังรายการ {money(tx.balance_after)}</div>
            </div>
          ))}
          {transactions.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีธุรกรรม</p> : null}
        </SectionCard>

        {adminProfile.is_owner ? (
          <SectionCard title="ลบบัญชีนี้" icon="alert">
            <details>
              <summary style={{ fontSize: 13, color: "#b42318", fontWeight: 700, cursor: "pointer" }}>
                ลบบัญชีลูกค้านี้ถาวร
              </summary>
              <form action={deleteUserAction} style={{ marginTop: 9, display: "grid", gap: 8 }}>
                <input type="hidden" name="user_id" value={profile.id} />
                <input type="hidden" name="return_to" value="/admin/customers" />
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                  ลบถาวร กู้คืนไม่ได้ — ออเดอร์ สลิป และประวัติทั้งหมดของลูกค้ารายนี้จะถูกลบไปด้วย ใช้กับบัญชีทดสอบเท่านั้น
                </p>
                <SubmitButton variant="danger" pendingLabel="กำลังลบ...">
                  ยืนยันลบบัญชีลูกค้านี้ถาวร
                </SubmitButton>
              </form>
            </details>
          </SectionCard>
        ) : null}
    </div>
  );
}
