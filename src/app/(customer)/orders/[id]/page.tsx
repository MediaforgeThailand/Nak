import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dateTime, money, orderStatusLabel } from "@/lib/format";
import { getOrderDetail } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  const photoPaths = (order.order_photos ?? []).map((photo: { storage_path: string }) => photo.storage_path);
  const photoUrls = await signedUrls("order-photos", photoPaths);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{order.order_number}</h2>
            <p className="text-sm text-muted">{dateTime(order.created_at)}</p>
          </div>
          <Badge tone={order.status === "rejected" ? "danger" : "accent"}>
            {orderStatusLabel(order.status)}
          </Badge>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">รายการสินค้า</h3>
        <div className="mt-3 grid gap-3">
          {(order.order_items ?? []).map((item: {
            id: string;
            product_name: string;
            sku: string;
            quantity: number;
            unit: string;
            line_total: number;
          }) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-sm text-muted">{item.sku} · {item.quantity} {item.unit}</p>
              </div>
              <p className="whitespace-nowrap font-semibold">{money(item.line_total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4">
          <span className="font-medium">ยอดรวม</span>
          <span className="text-xl font-semibold">{money(order.subtotal)}</span>
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
                <div key={photo.id} className="overflow-hidden rounded-md border border-border">
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
  );
}
