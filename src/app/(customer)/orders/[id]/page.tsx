import Image from "next/image";
import { CreditCard, MapPin, PackageCheck } from "lucide-react";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";
import { OrderProgress } from "@/components/orders/order-progress";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireCustomer } from "@/lib/auth";
import { compactDate, dateTime, money, orderStatusLabel } from "@/lib/format";
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
  const [{ id }, query, { profile }] = await Promise.all([
    params,
    searchParams,
    requireCustomer(),
  ]);
  const order = await getOrderDetail(id);
  const photoPaths = (order.order_photos ?? []).map((photo: { storage_path: string }) => photo.storage_path);
  const photoUrls = await signedUrls("order-photos", photoPaths);
  const shipping = (order.shipping_snapshot ?? null) as ShippingSnapshot | null;
  const addressLines = shippingLines(shipping);
  const isRejected = order.status === "rejected";

  return (
    <div className="grid gap-4">
      {query.ordered === "1" ? <ClearCartOnMount /> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-accent">รายละเอียดออเดอร์</p>
            <h2 className="mt-1 text-2xl font-semibold">{order.order_number}</h2>
            <p className="mt-1 text-sm text-muted">{dateTime(order.created_at)}</p>
          </div>
          <Badge tone={isRejected ? "danger" : "accent"}>
            {orderStatusLabel(order.status)}
          </Badge>
        </div>

        <div className="mt-5">
          <OrderProgress status={order.status} />
        </div>

        {isRejected ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-danger">
            {order.rejection_reason || order.admin_note || "ออเดอร์นี้ถูกปฏิเสธโดยแอดมิน"}
          </div>
        ) : order.admin_note ? (
          <div className="mt-4 rounded-2xl border border-white/60 bg-white/58 p-3 text-sm text-muted">
            หมายเหตุจากแอดมิน: {order.admin_note}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">สินค้าที่สั่ง</h3>
            </div>
            <div className="mt-3 grid gap-3">
              {(order.order_items ?? []).map((item: {
                id: string;
                product_name: string;
                sku: string;
                quantity: number;
                unit: string;
                unit_price: number;
                line_total: number;
              }) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-white/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted">
                      {item.sku} · {item.quantity} {item.unit} · {money(item.unit_price)} / {item.unit}
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-semibold">{money(item.line_total)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">รูปสินค้าที่แพ็คแล้ว</h3>
            {photoPaths.length === 0 ? (
              <p className="mt-2 text-sm text-muted">ยังไม่มีรูปจากทีมแพ็คสินค้า</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(order.order_photos ?? []).map((photo: { id: string; storage_path: string; caption: string | null }) => {
                  const url = photoUrls.get(photo.storage_path);
                  return (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border border-white/60 bg-white/48">
                      {url ? (
                        <Image
                          src={url}
                          alt={photo.caption ?? "Packed product photo"}
                          width={640}
                          height={480}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : null}
                      {photo.caption ? <p className="p-3 text-sm">{photo.caption}</p> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">ยอดเงิน</h3>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">ยอดออเดอร์</span>
                <span className="font-semibold">{money(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">ยอดค้างปัจจุบัน</span>
                <span className="text-lg font-semibold text-warning">{money(profile.debt_balance)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">บันทึกเป็นหนี้เมื่อ</span>
                <span className="text-sm font-medium">
                  {order.debt_applied_at ? compactDate(order.debt_applied_at) : "รออนุมัติ"}
                </span>
              </div>
            </div>
            <ButtonLink href="/payments/new" className="mt-4 w-full">
              ไปหน้าชำระเงิน
            </ButtonLink>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">ที่อยู่จัดส่ง</h3>
            </div>
            {addressLines.length > 0 ? (
              <div className="mt-3 grid gap-1 text-sm leading-6">
                {shipping?.label ? <p className="font-semibold">{shipping.label}</p> : null}
                {addressLines.map((line) => (
                  <p key={line} className="text-muted">{line}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">ไม่ได้ระบุที่อยู่ ให้ทีมงานติดต่อกลับ</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
