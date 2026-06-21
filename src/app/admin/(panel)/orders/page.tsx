import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  PackageCheck,
  Phone,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  approveOrderAction,
  rejectOrderAction,
  shipOrderWithPhotoAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { dateTime, money, orderStatusLabel } from "@/lib/format";
import { getAdminOrders } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];
type StageKey = "approve" | "ship" | "shipped";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  discount_per_unit: number;
  line_total: number;
  line_discount_total: number;
};

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

const stages: {
  key: StageKey;
  label: string;
  statuses: string[];
  Icon: typeof ClipboardCheck;
}[] = [
  {
    key: "approve",
    label: "ที่ต้องอนุมัติ",
    statuses: ["pending_admin"],
    Icon: ClipboardCheck,
  },
  {
    key: "ship",
    label: "ที่ต้องจัดส่ง",
    statuses: ["approved", "packing", "ready_to_ship"],
    Icon: Truck,
  },
  {
    key: "shipped",
    label: "จัดส่งแล้ว",
    statuses: ["shipping", "delivered"],
    Icon: PackageCheck,
  },
];

function normalizeStage(value: string | undefined): StageKey {
  return value === "ship" || value === "shipped" ? value : "approve";
}

function customerName(order: AdminOrder) {
  return order.customer?.company_name ?? order.customer?.full_name ?? order.customer?.email ?? "ไม่ระบุลูกค้า";
}

function customerPhone(order: AdminOrder) {
  return order.customer?.phone ?? "-";
}

function customerDebt(order: AdminOrder) {
  return Number(order.customer?.debt_balance ?? 0);
}

function shippingSnapshot(order: AdminOrder) {
  return (order.shipping_snapshot ?? null) as ShippingSnapshot | null;
}

function shippingName(order: AdminOrder) {
  return shippingSnapshot(order)?.recipient_name ?? customerName(order);
}

function shippingPhone(order: AdminOrder) {
  return shippingSnapshot(order)?.phone ?? customerPhone(order);
}

function shippingAddress(order: AdminOrder) {
  const snapshot = shippingSnapshot(order);
  if (!snapshot) return "ไม่ระบุที่อยู่";
  return [
    snapshot.address_line1,
    snapshot.address_line2,
    [snapshot.district, snapshot.province, snapshot.postal_code].filter(Boolean).join(" "),
  ].filter(Boolean).join(" ");
}

function photoCount(order: AdminOrder) {
  return (order.order_photos ?? []).length;
}

function stageTitle(stage: StageKey) {
  return stages.find((item) => item.key === stage)?.label ?? stages[0].label;
}

function OrderItems({ order }: { order: AdminOrder }) {
  return (
    <div className="grid gap-2 rounded-lg border border-white/60 bg-white/54 p-3">
      {(order.order_items ?? []).map((item: OrderItem) => (
        <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
          <span className="min-w-0 break-words">
            {item.product_name} × {item.quantity} {item.unit}
            {Number(item.discount_per_unit ?? 0) > 0 ? (
              <span className="mt-0.5 block text-xs font-semibold text-success">
                ลด {money(item.discount_per_unit)} / ชิ้น
              </span>
            ) : null}
          </span>
          <span className="whitespace-nowrap font-medium">{money(item.line_total)}</span>
        </div>
      ))}
    </div>
  );
}

function StageSelector({
  activeStage,
  counts,
}: {
  activeStage: StageKey;
  counts: Record<StageKey, number>;
}) {
  return (
    <Card className="p-3">
      <div className="grid grid-cols-3 gap-2">
        {stages.map(({ key, label, Icon }) => {
          const active = key === activeStage;
          const count = counts[key];

          return (
            <Link
              key={key}
              href={`/admin/orders?stage=${key}`}
              className={[
                "motion-surface relative grid min-h-[88px] place-items-center gap-1 rounded-lg border px-2 py-3 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "border-accent bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_28px_rgba(15,118,110,0.22)]"
                  : "border-white/70 bg-white/72 text-foreground hover:bg-white/92",
              ].join(" ")}
            >
              <span className="relative">
                <Icon className="h-7 w-7" />
                {count > 0 ? (
                  <span className="absolute -right-3 -top-3 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
                    {count}
                  </span>
                ) : null}
              </span>
              <span className="text-[12px] font-semibold leading-snug">{label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function ApproveCard({ order }: { order: AdminOrder }) {
  const debt = customerDebt(order);
  const subtotal = Number(order.subtotal ?? 0);

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{order.order_number}</h3>
          <p className="mt-1 text-sm text-muted">{dateTime(order.created_at)}</p>
        </div>
        <Badge tone="warning">{orderStatusLabel(order.status)}</Badge>
      </div>

      <div className="grid gap-2 rounded-lg border border-white/60 bg-white/54 p-3 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <UserRound className="h-4 w-4 text-accent" />
          {customerName(order)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[11px] text-muted">หนี้เดิม</p>
            <p className="font-semibold text-warning">{money(debt)}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[11px] text-muted">ออเดอร์นี้</p>
            <p className="font-semibold">{money(subtotal)}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[11px] text-muted">หลังอนุมัติ</p>
            <p className="font-semibold text-danger">{money(debt + subtotal)}</p>
          </div>
        </div>
      </div>

      <OrderItems order={order} />

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <form action={approveOrderAction}>
          <input type="hidden" name="order_id" value={order.id} />
          <SubmitButton pendingLabel="กำลังอนุมัติ..." className="w-full">
            อนุมัติ
            <CheckCircle2 className="h-4 w-4" />
          </SubmitButton>
        </form>
        <form action={rejectOrderAction} className="grid gap-2">
          <input type="hidden" name="order_id" value={order.id} />
          <Input name="reason" placeholder="เหตุผลที่ปฏิเสธ" />
          <SubmitButton variant="danger" pendingLabel="กำลังปฏิเสธ..." className="w-full">
            ปฏิเสธ
            <XCircle className="h-4 w-4" />
          </SubmitButton>
        </form>
      </div>
    </Card>
  );
}

function ShipCard({ order }: { order: AdminOrder }) {
  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{order.order_number}</h3>
          <p className="mt-1 text-sm text-muted">{customerName(order)} · {money(order.subtotal)}</p>
        </div>
        <Badge tone="accent">{orderStatusLabel(order.status)}</Badge>
      </div>

      <div className="grid gap-2 rounded-lg border border-teal-200 bg-teal-50/58 p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <UserRound className="h-4 w-4 text-accent" />
          {shippingName(order)}
        </p>
        <p className="flex items-center gap-2 text-muted">
          <Phone className="h-4 w-4 text-accent" />
          {shippingPhone(order)}
        </p>
        <p className="flex items-start gap-2 text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{shippingAddress(order)}</span>
        </p>
      </div>

      <OrderItems order={order} />

      <form action={shipOrderWithPhotoAction} className="grid gap-3">
        <input type="hidden" name="order_id" value={order.id} />
        <FileUploadPreview
          name="photo"
          accept="image/*"
          capture="environment"
          required
          hint="ถ่ายรูปสินค้าที่แพ็คพร้อมส่ง"
        />
        <Input name="caption" placeholder="หมายเหตุรูป (ไม่บังคับ)" />
        <SubmitButton pendingLabel="กำลังยืนยัน..." className="w-full">
          ยืนยันจัดส่งแล้ว
          <Truck className="h-4 w-4" />
        </SubmitButton>
      </form>
    </Card>
  );
}

function ShippedCard({
  order,
  photoUrls,
}: {
  order: AdminOrder;
  photoUrls: Map<string, string>;
}) {
  const photos = order.order_photos ?? [];

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{order.order_number}</h3>
          <p className="mt-1 text-sm text-muted">{customerName(order)} · {money(order.subtotal)}</p>
        </div>
        <Badge tone="success">จัดส่งแล้ว</Badge>
      </div>

      <div className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/62 p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Truck className="h-4 w-4" />
          ยืนยันจัดส่งแล้ว
        </p>
        <p className="text-muted">รูปแนบ {photoCount(order)} ไฟล์</p>
      </div>

      {photos.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.slice(0, 2).map((photo: { id: string; storage_path: string; caption: string | null }) => {
            const url = photoUrls.get(photo.storage_path);
            return (
              <div key={photo.id} className="overflow-hidden rounded-lg border border-white/70 bg-white/62">
                {url ? (
                  <Image
                    src={url}
                    alt={photo.caption ?? "รูปสินค้าก่อนจัดส่ง"}
                    width={640}
                    height={480}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center text-sm text-muted">
                    เปิดรูปไม่ได้
                  </div>
                )}
                {photo.caption ? <p className="p-2 text-xs text-muted">{photo.caption}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

function EmptyStage({ stage }: { stage: StageKey }) {
  return (
    <div className="rounded-lg border border-dashed border-white/70 bg-white/48 p-5 text-center text-sm text-muted">
      ไม่มีออเดอร์ในหมวด “{stageTitle(stage)}”
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const activeStage = normalizeStage(params.stage);
  const orders = await getAdminOrders();
  const counts = stages.reduce((acc, stage) => {
    acc[stage.key] = orders.filter((order) => stage.statuses.includes(order.status)).length;
    return acc;
  }, {} as Record<StageKey, number>);
  const currentStage = stages.find((stage) => stage.key === activeStage) ?? stages[0];
  const visibleOrders = orders.filter((order) => currentStage.statuses.includes(order.status));
  const photoPaths = activeStage === "shipped"
    ? visibleOrders.flatMap((order) => (order.order_photos ?? []).map((photo: { storage_path: string }) => photo.storage_path))
    : [];
  const photoUrls = await signedUrls("order-photos", photoPaths, "admin");

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">จัดการออเดอร์</h2>
        <p className="mt-1 text-sm text-muted">เลือกขั้นตอน แล้วทำงานเฉพาะรายการในขั้นนั้น</p>
      </div>

      <StageSelector activeStage={activeStage} counts={counts} />

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{stageTitle(activeStage)}</h3>
        <Badge tone={visibleOrders.length > 0 ? "accent" : "neutral"}>
          {visibleOrders.length} รายการ
        </Badge>
      </div>

      <div className="grid gap-3">
        {visibleOrders.length === 0 ? <EmptyStage stage={activeStage} /> : null}
        {visibleOrders.map((order) => {
          if (activeStage === "approve") return <ApproveCard key={order.id} order={order} />;
          if (activeStage === "ship") return <ShipCard key={order.id} order={order} />;
          return <ShippedCard key={order.id} order={order} photoUrls={photoUrls} />;
        })}
      </div>
    </div>
  );
}
