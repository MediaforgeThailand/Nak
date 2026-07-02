import Link from "next/link";
import { signOutCustomerAction } from "@/app/actions/auth";
import { saveAddressAction, updateProfileAction } from "@/app/actions/customer";
import { Icon } from "@/components/nak/icon";
import { Badge, InfoRow, NakField, SectionCard, StatCard } from "@/components/nak/ui";
import { Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses, getCustomerOrders, getPayments, getPriceProgramStatus, getTransactions } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, money, paymentStatusLabel, transactionLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireCustomer();
  const [addresses, orders, transactions, payments, priceProgram] = await Promise.all([
    getCustomerAddresses(),
    getCustomerOrders(),
    getTransactions(),
    getPayments(),
    getPriceProgramStatus(),
  ]);
  const totalPurchased = orders
    .filter((order) => !["rejected", "cancelled"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0);
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const approved = profile.status === "approved";

  return (
    <div style={{ display: "grid", gap: 13, padding: "14px 14px 24px" }}>
      <div className="nak-card" style={{ padding: 16, display: "flex", gap: 13, alignItems: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "var(--p-soft)",
            color: "var(--p-deep)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="building" size={26} stroke={1.9} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>
            {profile.company_name ?? profile.full_name ?? profile.email}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{profile.full_name ?? profile.email}</div>
        </div>
        <Badge tone={approved ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
          <Icon name="checkCircle" size={13} stroke={2.4} /> {accountStatusLabel(profile.status)}
        </Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
        <StatCard label="ยอดค้าง" value={money(profile.debt_balance)} tone="warning" icon="wallet" />
        <StatCard label="ซื้อทั้งหมด" value={money(totalPurchased)} tone="success" icon="bag" />
        <StatCard label="ออเดอร์" value={String(orders.length)} icon="receipt" />
      </div>

      <Link
        href="/price-program"
        className="nak-card nak-press"
        style={{ padding: 14, display: "flex", alignItems: "center", gap: 11, textAlign: "left", width: "100%" }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "#e7f4ec",
            color: "#1b7a4b",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="trending" size={18} stroke={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Price Program — ราคาตามยอดซื้อ</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            สะสมเดือนนี้ {Number(priceProgram.month_quantity ?? 0).toLocaleString("th-TH")} ชิ้น · ดูตารางราคาและ Level
          </div>
        </div>
        <Icon name="chevR" size={18} stroke={2.4} style={{ color: "var(--muted)" }} />
      </Link>

      <Link
        href="/payments/new"
        className="nak-card nak-press"
        style={{ padding: 14, display: "flex", alignItems: "center", gap: 11, textAlign: "left", width: "100%" }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "var(--p-soft)",
            color: "var(--p-deep)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="card" size={18} stroke={2.2} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>ชำระยอดค้าง</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>แจ้งโอนและแนบสลิปให้แอดมินตรวจ</div>
        </div>
        <Icon name="chevR" size={18} stroke={2.4} style={{ color: "var(--muted)" }} />
      </Link>

      <SectionCard title="ข้อมูลติดต่อ" icon="user">
        <InfoRow icon="building" label="บริษัท / ร้านค้า" value={profile.company_name ?? "—"} />
        <InfoRow icon="phone" label="เบอร์โทร" value={profile.phone ?? "—"} />
        <InfoRow icon="mail" label="อีเมล" value={profile.email} />
        <InfoRow
          icon="pin"
          label="ที่อยู่จัดส่ง"
          last
          value={
            defaultAddress
              ? `${defaultAddress.address_line1}, ${[defaultAddress.district, defaultAddress.province, defaultAddress.postal_code]
                  .filter(Boolean)
                  .join(" ")}`
              : "ยังไม่มีที่อยู่"
          }
        />
      </SectionCard>

      <details className="nak-card" style={{ padding: 16 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", listStyle: "none" }}>
          <Icon name="edit" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>แก้ไขข้อมูลติดต่อ</h3>
          <Icon name="chevD" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action={updateProfileAction} style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <NakField label="ชื่อผู้ติดต่อ">
            <Input name="full_name" defaultValue={profile.full_name ?? ""} />
          </NakField>
          <NakField label="บริษัท / ร้านค้า">
            <Input name="company_name" defaultValue={profile.company_name ?? ""} />
          </NakField>
          <NakField label="เบอร์โทร">
            <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} />
          </NakField>
          <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
            บันทึกโปรไฟล์
          </SubmitButton>
        </form>
      </details>

      <details className="nak-card" style={{ padding: 16 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", listStyle: "none" }}>
          <Icon name="pin" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>เพิ่มที่อยู่จัดส่ง</h3>
          <Icon name="chevD" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action={saveAddressAction} style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <NakField label="ชื่อที่อยู่">
            <Input name="label" defaultValue="หน้าร้าน" />
          </NakField>
          <NakField label="ผู้รับ">
            <Input name="recipient_name" required />
          </NakField>
          <NakField label="เบอร์โทร">
            <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" />
          </NakField>
          <NakField label="ที่อยู่">
            <Textarea name="address_line1" required />
          </NakField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <NakField label="ตำบล/อำเภอ">
              <Input name="district" />
            </NakField>
            <NakField label="จังหวัด">
              <Input name="province" />
            </NakField>
            <NakField label="ไปรษณีย์">
              <Input name="postal_code" inputMode="numeric" autoComplete="postal-code" />
            </NakField>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input name="is_default" type="checkbox" /> ตั้งเป็นที่อยู่หลัก
          </label>
          <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
            เพิ่มที่อยู่
          </SubmitButton>
        </form>
      </details>

      <SectionCard
        title="ธุรกรรมล่าสุด"
        icon="receipt"
        action={
          <Link href="/transactions" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p)" }}>
            ดูทั้งหมด
          </Link>
        }
      >
        {transactions.slice(0, 4).map((tx, i) => (
          <div
            key={tx.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: i < Math.min(transactions.length, 4) - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{transactionLabel(tx.type, tx.note)}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(tx.created_at)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: Number(tx.amount) < 0 ? "#1b7a4b" : "#a35a10" }}>
                {Number(tx.amount) < 0 ? "" : "+"}
                {money(tx.amount)}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>คงเหลือ {money(tx.balance_after)}</div>
            </div>
          </div>
        ))}
        {transactions.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีรายการ</p> : null}
      </SectionCard>

      <SectionCard title="ประวัติแจ้งชำระ" icon="card">
        {payments.slice(0, 5).map((payment, i) => (
          <div
            key={payment.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: i < Math.min(payments.length, 5) - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{payment.payment_number}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(payment.created_at)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{money(payment.amount)}</span>
              <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                {paymentStatusLabel(payment.status)}
              </Badge>
            </div>
          </div>
        ))}
        {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีประวัติ</p> : null}
      </SectionCard>

      <form action={signOutCustomerAction}>
        <button type="submit" className="nak-logout">
          <Icon name="logout" size={18} stroke={2.2} /> ออกจากระบบ
        </button>
      </form>
    </div>
  );
}
