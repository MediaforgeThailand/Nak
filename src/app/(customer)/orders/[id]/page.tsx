import Image from "next/image";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";
import { Icon } from "@/components/nak/icon";
import { SubHeader } from "@/components/nak/sub-header";
import { Badge, OrderProgress, Row, StatusBadge } from "@/components/nak/ui";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomer } from "@/lib/auth";
import { compactDate, dateTime, money, shippingMethodLabel } from "@/lib/format";
import { getOrderDetail } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type ShippingSnapshot = {
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

function shippingLines(snapshot: ShippingSnapshot | null) {
  if (!snapshot) return [];
  return [
    snapshot.recipient_name,
    snapshot.phone,
    snapshot.address_line1,
    snapshot.address_line2,
    [snapshot.district, snapshot.province, snapshot.postal_code].filter(Boolean).join(" "),
  ].filter(Boolean) as string[];
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ordered?: string }>;
}) {
  const [{ id }, query, { profile }] = await Promise.all([params, searchParams, requireCustomer()]);
  const order = await getOrderDetail(id);
  if (!order) notFound();
  const photoPaths = (order.order_photos ?? []).map((photo: { storage_path: string }) => photo.storage_path);
  const photoUrls = await signedUrls("order-photos", photoPaths);
  const shipping = (order.shipping_snapshot ?? null) as ShippingSnapshot | null;
  const addressLines = shippingLines(shipping);
  const isRejected = order.status === "rejected";
  const isCancelled = order.status === "cancelled";
  const items = order.order_items ?? [];

  return (
    <>
      {query.ordered === "1" ? <ClearCartOnMount /> : null}
      <SubHeader title={order.order_number} right={<StatusBadge status={order.status} />} fallbackHref="/orders" />

      <div style={{ display: "grid", gap: 13, padding: "14px 14px 32px" }}>
        <div className="nak-card" style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{dateTime(order.created_at)}</div>
          <OrderProgress status={order.status} />
          {isRejected ? (
            <div
              style={{
                display: "flex",
                gap: 9,
                background: "#fbe6e3",
                border: "1px solid #f3c8c2",
                padding: "11px 12px",
                borderRadius: "var(--r-sm)",
                color: "#b42318",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <Icon name="xCircle" size={17} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{order.rejection_reason || order.admin_note || "ออเดอร์นี้ถูกปฏิเสธโดยแอดมิน"}</span>
            </div>
          ) : isCancelled ? (
            <div
              style={{
                display: "flex",
                gap: 9,
                background: "#fbe6e3",
                border: "1px solid #f3c8c2",
                padding: "11px 12px",
                borderRadius: "var(--r-sm)",
                color: "#b42318",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <Icon name="xCircle" size={17} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>ออเดอร์ถูกยกเลิก: {order.cancellation_reason || "โดยแอดมิน"} (ยอดหนี้และสต็อกถูกคืนแล้ว)</span>
            </div>
          ) : order.admin_note ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>หมายเหตุจากแอดมิน: {order.admin_note}</div>
          ) : null}
        </div>

        <div className="nak-card" style={{ padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="package" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>สินค้าที่สั่ง</h3>
          </div>
          <div style={{ display: "grid", gap: 11 }}>
            {items.map(
              (
                it: {
                  id: string;
                  product_name: string;
                  sku: string;
                  quantity: number;
                  unit: string;
                  unit_price: number;
                  discount_per_unit: number;
                  line_total: number;
                },
                idx: number,
              ) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    paddingBottom: 11,
                    borderBottom: idx < items.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{it.product_name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {it.sku} · {it.quantity} {it.unit} · {money(it.unit_price)}/{it.unit}
                    </div>
                    {Number(it.discount_per_unit ?? 0) > 0 ? (
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1b7a4b", marginTop: 2 }}>
                        ลด {money(it.discount_per_unit)}/{it.unit}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{money(it.line_total)}</div>
                </div>
              ),
            )}
          </div>
        </div>

        {photoPaths.length > 0 ? (
          <div className="nak-card" style={{ padding: 16, display: "grid", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="camera" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>รูปสินค้าที่แพ็คแล้ว</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(order.order_photos ?? []).map((photo: { id: string; storage_path: string; caption: string | null }, i: number) => {
                const url = photoUrls.get(photo.storage_path);
                return (
                  <div
                    key={photo.id}
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 3",
                      borderRadius: "var(--r-sm)",
                      overflow: "hidden",
                      background: "var(--chip)",
                      display: "grid",
                      placeItems: "center",
                      color: "rgba(0,0,0,.28)",
                    }}
                  >
                    {url ? (
                      <Image src={url} alt={photo.caption ?? "รูปสินค้า"} fill priority={i === 0} sizes="240px" className="object-cover" />
                    ) : (
                      <Icon name="camera" size={26} stroke={1.6} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="nak-card" style={{ padding: 16, display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <Icon name="card" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>ยอดเงิน</h3>
          </div>
          {Number(order.total_discount ?? 0) > 0 ? (
            <>
              <Row label="ยอดก่อนลด" value={money(order.total_before_discount)} />
              <Row label="ส่วนลดรวม" value={"-" + money(order.total_discount)} valColor="#1b7a4b" />
            </>
          ) : null}
          <Row label="ยอดออเดอร์สุทธิ" value={money(order.subtotal)} bold />
          <div style={{ height: 1, background: "var(--line)" }} />
          <Row label="ยอดค้างปัจจุบัน" value={money(profile.debt_balance)} valColor="#a35a10" bold />
          <Row label="บันทึกเป็นหนี้เมื่อ" value={order.debt_applied_at ? compactDate(order.debt_applied_at) : "รออนุมัติ"} small />
          <ButtonLink href="/payments/new" variant={isRejected ? "secondary" : "primary"} className="mt-1 w-full">
            <Icon name="card" size={18} stroke={2.2} />
            ไปหน้าชำระเงิน
          </ButtonLink>
        </div>

        <div className="nak-card" style={{ padding: 16, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="pin" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>ที่อยู่จัดส่ง</h3>
            <Badge tone="accent">
              <Icon name={order.shipping_method === "grab" ? "bike" : "truck"} size={12} stroke={2.4} />
              {shippingMethodLabel(order.shipping_method)}
            </Badge>
          </div>
          {addressLines.length > 0 ? (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
              {shipping?.label ? <div style={{ color: "var(--ink)", fontWeight: 600 }}>{shipping.label}</div> : null}
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>ไม่ได้ระบุที่อยู่ ให้ทีมงานติดต่อกลับ</div>
          )}
        </div>
      </div>
    </>
  );
}
