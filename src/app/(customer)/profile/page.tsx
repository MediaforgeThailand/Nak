import Link from "next/link";
import { signOutCustomerAction } from "@/app/actions/auth";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction, updateProfileAction } from "@/app/actions/customer";
import { Icon } from "@/components/nak/icon";
import { Badge, InfoRow, NakField, SectionCard } from "@/components/nak/ui";
import { Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses, getCustomerOrders, getPayments, getPriceProgramStatus, getTransactions } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, money, paymentStatusLabel, transactionLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  profile: "บันทึกข้อมูลติดต่อแล้ว",
  address: "บันทึกที่อยู่แล้ว",
  "address-deleted": "ลบที่อยู่แล้ว",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; paid?: string }>;
}) {
  // RLS scopes every read to the signed-in customer, so the data queries don't
  // depend on requireCustomer()'s result — run them all in one batch.
  const [params, { profile }, addresses, orders, transactions, payments, priceProgram] = await Promise.all([
    searchParams,
    requireCustomer(),
    getCustomerAddresses(),
    getCustomerOrders(),
    getTransactions(),
    getPayments(),
    getPriceProgramStatus(),
  ]);
  const totalPurchased = orders
    .filter((order) => !["rejected", "cancelled"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0);
  const approved = profile.status === "approved";
  // LINE-only accounts get a synthetic internal email — never show it as the user's email.
  const isLineOnlyEmail = (profile.email ?? "").endsWith("@line.nak.local");
  const displayEmail = isLineOnlyEmail ? "เข้าสู่ระบบผ่าน LINE" : profile.email;
  const displayName = profile.company_name || profile.full_name || (isLineOnlyEmail ? "ลูกค้า NAK" : profile.email);
  const successMessage = params.paid
    ? "ส่งสลิปเรียบร้อย — แอดมินจะตรวจและตัดยอดให้เร็วที่สุด ดูสถานะได้ที่ประวัติแจ้งชำระด้านล่าง"
    : params.saved
      ? savedMessages[params.saved] ?? null
      : null;

  return (
    <div style={{ display: "grid", gap: 13, padding: "14px 14px 24px" }}>
      {successMessage ? (
        <div
          style={{
            background: "#e7f4ec",
            border: "1px solid #bfe3cd",
            padding: "11px 12px",
            borderRadius: "var(--r-sm)",
            color: "#1b7a4b",
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Icon name="checkCircle" size={15} stroke={2.4} /> {successMessage}
        </div>
      ) : null}
      {params.error ? (
        <div
          style={{
            background: "#fbe6e3",
            border: "1px solid #f3c8c2",
            padding: "11px 12px",
            borderRadius: "var(--r-sm)",
            color: "#b42318",
            fontSize: 12.5,
          }}
        >
          {params.error}
        </div>
      ) : null}
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
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>{displayName}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{profile.full_name || displayEmail}</div>
        </div>
        <Badge tone={approved ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
          <Icon name="checkCircle" size={13} stroke={2.4} /> {accountStatusLabel(profile.status)}
        </Badge>
      </div>

      <div className="nak-card" style={{ padding: "6px 16px" }}>
        {[
          { icon: "wallet", label: "ยอดค้างชำระ", value: money(profile.debt_balance), color: "#a35a10" },
          { icon: "bag", label: "ซื้อทั้งหมด", value: money(totalPurchased), color: "#1b7a4b" },
          { icon: "receipt", label: "ออเดอร์ทั้งหมด", value: `${orders.length.toLocaleString("th-TH")} รายการ`, color: "var(--ink)" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 0",
              borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <Icon name={row.icon} size={16} stroke={2.2} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{row.label}</span>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em", color: row.color, whiteSpace: "nowrap" }}>
              {row.value}
            </span>
          </div>
        ))}
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
        <InfoRow icon="mail" label="อีเมล" last value={displayEmail} />
      </SectionCard>

      <SectionCard title="ที่อยู่จัดส่ง" icon="pin">
        {addresses.map((address, i) => (
          <div
            key={address.id}
            style={{
              display: "grid",
              gap: 8,
              padding: "11px 0",
              borderBottom: i < addresses.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>{address.label}</span>
              {address.is_default ? <Badge tone="accent">ที่อยู่หลัก</Badge> : null}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
              {address.recipient_name}
              {address.phone ? ` · ${address.phone}` : ""}
              <br />
              {address.address_line1}
              {address.address_line2 ? ` ${address.address_line2}` : ""}{" "}
              {[address.district, address.province, address.postal_code].filter(Boolean).join(" ")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {!address.is_default ? (
                <form action={setDefaultAddressAction}>
                  <input type="hidden" name="address_id" value={address.id} />
                  <SubmitButton variant="secondary" pendingLabel="...">
                    ตั้งเป็นหลัก
                  </SubmitButton>
                </form>
              ) : null}
              <form action={deleteAddressAction}>
                <input type="hidden" name="address_id" value={address.id} />
                <SubmitButton variant="secondary" pendingLabel="กำลังลบ...">
                  ลบ
                </SubmitButton>
              </form>
            </div>
            <details>
              <summary style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p)", cursor: "pointer" }}>
                แก้ไขที่อยู่นี้
              </summary>
              <form action={saveAddressAction} style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <input type="hidden" name="address_id" value={address.id} />
                <NakField label="ชื่อที่อยู่">
                  <Input name="label" defaultValue={address.label ?? ""} />
                </NakField>
                <NakField label="ผู้รับ">
                  <Input name="recipient_name" required defaultValue={address.recipient_name ?? ""} />
                </NakField>
                <NakField label="เบอร์โทร">
                  <Input name="phone" type="tel" inputMode="tel" defaultValue={address.phone ?? ""} />
                </NakField>
                <NakField label="ที่อยู่">
                  <Textarea name="address_line1" required defaultValue={address.address_line1 ?? ""} />
                </NakField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <NakField label="ตำบล/อำเภอ">
                    <Input name="district" defaultValue={address.district ?? ""} />
                  </NakField>
                  <NakField label="จังหวัด">
                    <Input name="province" defaultValue={address.province ?? ""} />
                  </NakField>
                  <NakField label="ไปรษณีย์">
                    <Input name="postal_code" inputMode="numeric" defaultValue={address.postal_code ?? ""} />
                  </NakField>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input name="is_default" type="checkbox" defaultChecked={address.is_default} /> ตั้งเป็นที่อยู่หลัก
                </label>
                <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
                  บันทึกที่อยู่
                </SubmitButton>
              </form>
            </details>
          </div>
        ))}
        {addresses.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีที่อยู่ — เพิ่มด้านล่างเพื่อให้สั่งซื้อได้</p>
        ) : null}
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
