import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { money } from "@/lib/format";

export function CreditSummary({
  debtBalance,
  discountPerItem,
}: {
  debtBalance: number;
  discountPerItem: number;
}) {
  return (
    <div className="nak-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, var(--p-deep), var(--p))", color: "#fff", padding: "15px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.82, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="wallet" size={14} stroke={2.2} /> ยอดค้างชำระ
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: "-.02em" }}>{money(debtBalance)}</div>
          </div>
          <Link
            href="/payments/new"
            style={{
              flexShrink: 0,
              background: "rgba(255,255,255,.18)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.28)",
              padding: "8px 13px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            <Icon name="card" size={15} stroke={2.2} /> ชำระเงิน
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", color: "var(--ink)" }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "#e7f4ec",
            color: "#1b7a4b",
          }}
        >
          <Icon name="percent" size={14} stroke={2.4} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>ส่วนลดสมาชิก</span>
        <span style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 700, color: "#1b7a4b" }}>
          {discountPerItem > 0 ? `ลด ${money(discountPerItem)} / ชิ้น` : "ยังไม่มีส่วนลด"}
        </span>
      </div>
    </div>
  );
}
