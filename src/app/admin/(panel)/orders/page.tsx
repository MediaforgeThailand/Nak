import Image from "next/image";
import Link from "next/link";
import { approveOrderAction, cancelOrderAction, rejectOrderAction } from "@/app/actions/admin";
import { HandoffList, type HandoffOrder } from "@/components/nak/handoff-list";
import { Icon } from "@/components/nak/icon";
import { PackForm } from "@/components/nak/pack-form";
import { AdBadge, AdminTabs, Avatar } from "@/components/nak/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireStaff } from "@/lib/auth";
import { dateTime, money, shippingMethodLabel } from "@/lib/format";
import { getAdminOrders } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];
type StageKey = "approve" | "pack" | "handoff" | "shipped";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  line_total: number;
};

type ShippingSnapshot = {
  recipient_name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

const STAGES: { key: StageKey; statuses: string[] }[] = [
  { key: "approve", statuses: ["pending_admin"] },
  { key: "pack", statuses: ["approved", "packing"] },
  { key: "handoff", statuses: ["ready_to_ship"] },
  { key: "shipped", statuses: ["shipping", "delivered"] },
];

function normalizeStage(value: string | undefined): StageKey {
  if (value === "pack" || value === "handoff" || value === "shipped") return value;
  if (value === "ship") return "pack"; // old bookmarked links
  return "approve";
}

function MethodBadge({ order }: { order: AdminOrder }) {
  const isGrab = order.shipping_method === "grab";
  return (
    <AdBadge tone={isGrab ? "success" : "accent"}>
      <Icon name={isGrab ? "bike" : "truck"} size={13} stroke={2.4} /> {shippingMethodLabel(order.shipping_method)}
    </AdBadge>
  );
}

function customerName(order: AdminOrder) {
  return order.customer?.company_name ?? order.customer?.full_name ?? order.customer?.email ?? "ไม่ระบุลูกค้า";
}

function shippingSnapshot(order: AdminOrder) {
  return (order.shipping_snapshot ?? null) as ShippingSnapshot | null;
}

function shippingAddress(order: AdminOrder) {
  const s = shippingSnapshot(order);
  if (!s) return "ไม่ระบุที่อยู่";
  return (
    [s.address_line1, s.address_line2, [s.district, s.province, s.postal_code].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" ") || "ไม่ระบุที่อยู่"
  );
}

function ItemsBox({ order }: { order: AdminOrder }) {
  return (
    <div style={{ display: "grid", gap: 7, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 12, background: "var(--bg)" }}>
      {(order.order_items ?? []).map((it: OrderItem) => (
        <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
          <span style={{ minWidth: 0 }}>
            {it.product_name} <span style={{ color: "var(--muted)" }}>× {it.quantity} {it.unit}</span>
          </span>
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{money(it.line_total)}</span>
        </div>
      ))}
    </div>
  );
}

function OrderHead({ order, badge }: { order: AdminOrder; badge: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{order.order_number}</h3>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>{dateTime(order.created_at)}</p>
      </div>
      {badge}
    </div>
  );
}

function DebtCell({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) {
  const fg = tone === "danger" ? "#b42318" : tone === "warn" ? "#a35a10" : "var(--ink)";
  return (
    <div style={{ background: "var(--bg)", borderRadius: 10, padding: "8px 9px" }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: fg }}>{value}</div>
    </div>
  );
}

function ApproveCard({ order, canAct }: { order: AdminOrder; canAct: boolean }) {
  const debt = Number(order.customer?.debt_balance ?? 0);
  const subtotal = Number(order.subtotal ?? 0);
  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 13 }}>
      <OrderHead
        order={order}
        badge={
          <AdBadge tone="warning">
            <Icon name="clock" size={13} stroke={2.4} /> รออนุมัติ
          </AdBadge>
        }
      />
      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 12, display: "grid", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5 }}>
          <Avatar name={customerName(order)} size={30} /> {customerName(order)}
        </div>
        {/* Customer debt is admin-only — packing staff should not see it. */}
        {canAct ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <DebtCell label="หนี้เดิม" value={money(debt)} tone="warn" />
            <DebtCell label="ออเดอร์นี้" value={money(subtotal)} />
            <DebtCell label="หลังอนุมัติ" value={money(debt + subtotal)} tone="danger" />
          </div>
        ) : null}
      </div>
      <ItemsBox order={order} />
      {canAct ? (
        <div style={{ display: "grid", gap: 8 }}>
          <form action={approveOrderAction}>
            <input type="hidden" name="order_id" value={order.id} />
            <SubmitButton pendingLabel="กำลังอนุมัติ..." className="w-full">
              <Icon name="check" size={17} stroke={2.6} /> อนุมัติออเดอร์
            </SubmitButton>
          </form>
          <form action={rejectOrderAction} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="order_id" value={order.id} />
            <input className="ad-input" name="reason" placeholder="เหตุผลที่ปฏิเสธ" />
            <SubmitButton variant="danger" pendingLabel="..." className="w-auto shrink-0 px-4">
              <Icon name="x" size={17} stroke={2.6} />
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
          รอแอดมินอนุมัติ — บัญชีทีมจัดสินค้าดูได้อย่างเดียว
        </p>
      )}
    </div>
  );
}

// Admin-only escape hatch: cancel an approved order before it ships.
// Restores stock and reverses the customer's debt via cancel_approved_order.
function CancelOrderControl({ order, stage }: { order: AdminOrder; stage: "pack" | "handoff" }) {
  return (
    <details>
      <summary style={{ fontSize: 12, color: "#b42318", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
        ยกเลิกออเดอร์นี้ (คืนสต็อก + คืนยอดหนี้)
      </summary>
      <form action={cancelOrderAction} style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input type="hidden" name="order_id" value={order.id} />
        <input type="hidden" name="stage" value={stage} />
        <input className="ad-input" name="reason" placeholder="เหตุผลการยกเลิก (จำเป็น)" required />
        <SubmitButton variant="danger" pendingLabel="..." className="w-auto shrink-0 px-4">
          ยืนยันยกเลิก
        </SubmitButton>
      </form>
    </details>
  );
}

function PackCard({ order, canCancel }: { order: AdminOrder; canCancel: boolean }) {
  const isGrab = order.shipping_method === "grab";
  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 13 }}>
      <OrderHead
        order={order}
        badge={
          <AdBadge tone="warning">
            <Icon name="package" size={13} stroke={2.4} /> จัดสินค้า
          </AdBadge>
        }
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <MethodBadge order={order} />
      </div>
      <div style={{ background: "var(--p-soft)", borderRadius: "var(--r-sm)", padding: 12, display: "grid", gap: 7, fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          <Icon name="user" size={15} stroke={2.2} style={{ color: "var(--p-deep)" }} /> {customerName(order)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
          <Icon name="phone" size={15} stroke={2.2} style={{ color: "var(--p-deep)" }} /> {order.customer?.phone ?? "-"}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--muted)" }}>
          <Icon name="pin" size={15} stroke={2.2} style={{ color: "var(--p-deep)", flexShrink: 0, marginTop: 1 }} /> {shippingAddress(order)}
        </div>
      </div>
      <PackForm
        orderId={order.id}
        isGrab={isGrab}
        items={(order.order_items ?? []).map((it: OrderItem) => ({
          id: it.id,
          name: it.product_name,
          quantity: it.quantity,
          unit: it.unit,
          lineTotal: money(it.line_total),
        }))}
      />
      {canCancel ? <CancelOrderControl order={order} stage="pack" /> : null}
    </div>
  );
}

function ShippedCard({ order, photoUrls }: { order: AdminOrder; photoUrls: Map<string, string> }) {
  const photos = order.order_photos ?? [];
  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 13 }}>
      <OrderHead
        order={order}
        badge={
          <AdBadge tone="success">
            <Icon name="checkCircle" size={13} stroke={2.4} /> ส่งแล้ว
          </AdBadge>
        }
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <MethodBadge order={order} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#1b7a4b",
          fontSize: 13,
          fontWeight: 700,
          background: "#e7f4ec",
          padding: "10px 12px",
          borderRadius: "var(--r-sm)",
        }}
      >
        <Icon name="truck" size={16} stroke={2.2} /> {customerName(order)} · {money(order.subtotal)} · รูป {photos.length}
      </div>
      {photos.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {photos.slice(0, 2).map((photo: { id: string; storage_path: string; caption: string | null }) => {
            const url = photoUrls.get(photo.storage_path);
            return (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  aspectRatio: "4/3",
                  borderRadius: "var(--r-sm)",
                  overflow: "hidden",
                  background: "var(--chip)",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(0,0,0,.28)",
                }}
              >
                {url ? (
                  <Image src={url} alt={photo.caption ?? "รูปสินค้า"} fill sizes="220px" className="object-cover" />
                ) : (
                  <Icon name="camera" size={24} stroke={1.6} />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; stage?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const activeStage = normalizeStage(params.stage);
  const [{ profile }, orders] = await Promise.all([requireStaff(), getAdminOrders()]);
  const isAdmin = profile.role === "admin";
  const counts = STAGES.reduce((acc, stage) => {
    acc[stage.key] = orders.filter((order) => stage.statuses.includes(order.status)).length;
    return acc;
  }, {} as Record<StageKey, number>);
  const current = STAGES.find((s) => s.key === activeStage) ?? STAGES[0];
  const visibleOrders = orders.filter((order) => current.statuses.includes(order.status));
  const photoPaths =
    activeStage === "shipped" || activeStage === "handoff"
      ? visibleOrders.flatMap((order) => (order.order_photos ?? []).map((p: { storage_path: string }) => p.storage_path))
      : [];
  const photoUrls = await signedUrls("order-photos", photoPaths, "admin");

  const handoffOrders: HandoffOrder[] =
    activeStage === "handoff"
      ? visibleOrders.map((order) => {
          const phone = shippingSnapshot(order)?.phone || order.customer?.phone || "";
          const address = shippingAddress(order);
          const copyText = [order.order_number, phone, address !== "ไม่ระบุที่อยู่" ? address : ""]
            .filter(Boolean)
            .join("\n");
          return {
            id: order.id,
            orderNumber: order.order_number,
            createdAt: dateTime(order.created_at),
            isGrab: order.shipping_method === "grab",
            methodLabel: shippingMethodLabel(order.shipping_method),
            customerName: customerName(order),
            phone,
            address,
            copyText,
            items: (order.order_items ?? []).map((it: OrderItem) => ({
              id: it.id,
              label: `${it.product_name} × ${it.quantity} ${it.unit}`,
              total: money(it.line_total),
            })),
            photos: (order.order_photos ?? []).map((p: { id: string; storage_path: string; caption: string | null }) => ({
              id: p.id,
              url: photoUrls.get(p.storage_path) ?? null,
              caption: p.caption,
            })),
          };
        })
      : [];

  const tabs = [
    { key: "approve", label: "อนุมัติ", href: "/admin/orders?stage=approve", count: counts.approve },
    { key: "pack", label: "จัดสินค้า", href: "/admin/orders?stage=pack", count: counts.pack },
    { key: "handoff", label: "จัดส่ง", href: "/admin/orders?stage=handoff", count: counts.handoff },
    { key: "shipped", label: "ส่งแล้ว", href: "/admin/orders?stage=shipped", count: 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-.02em" }}>จัดการออเดอร์</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>ทำงานทีละขั้นจนถึงจัดส่ง</p>
        </div>
        {isAdmin ? (
          <Link href="/admin/orders/new" className="ad-btn ad-btn-primary" style={{ width: "auto", padding: "9px 14px", flexShrink: 0, whiteSpace: "nowrap" }}>
            <Icon name="plus" size={16} stroke={2.6} /> สั่งแทนลูกค้า
          </Link>
        ) : null}
      </div>

      <AdminTabs tabs={tabs} active={activeStage} />

      {params.ok === "created" ? (
        <div style={{ background: "#e7f4ec", border: "1px solid #bfe3cd", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#1b7a4b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="checkCircle" size={15} stroke={2.4} /> สร้างออเดอร์ให้ลูกค้าแล้ว — รออนุมัติในแท็บ “อนุมัติ”
        </div>
      ) : null}
      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      {visibleOrders.length === 0 ? (
        <div className="ad-card" style={{ padding: 26, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          ไม่มีออเดอร์ในหมวดนี้
        </div>
      ) : activeStage === "handoff" ? (
        <HandoffList orders={handoffOrders} canCancel={isAdmin} />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleOrders.map((order) => {
            if (activeStage === "approve") return <ApproveCard key={order.id} order={order} canAct={isAdmin} />;
            if (activeStage === "pack") return <PackCard key={order.id} order={order} canCancel={isAdmin} />;
            return <ShippedCard key={order.id} order={order} photoUrls={photoUrls} />;
          })}
        </div>
      )}
    </div>
  );
}
