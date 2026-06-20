import {
  approveOrderAction,
  rejectOrderAction,
  updateOrderStatusAction,
  uploadOrderPhotoAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { dateTime, money, orderStatusLabel } from "@/lib/format";
import { getAdminOrders } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

const nextStatuses = ["packing", "ready_to_ship", "shipping", "delivered"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const orders = await getAdminOrders();

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">จัดการออเดอร์</h2>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

      <div className="grid gap-3">
        {orders.map((order) => (
          <Card key={order.id}>
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{order.order_number}</h3>
                  <Badge tone={order.status === "pending_admin" ? "warning" : order.status === "rejected" ? "danger" : "accent"}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {order.customer?.company_name ?? order.customer?.full_name ?? order.customer?.email}
                  {" · "}
                  {dateTime(order.created_at)}
                </p>
                <div className="mt-3 grid gap-2">
                  {(order.order_items ?? []).map((item: {
                    id: string;
                    product_name: string;
                    quantity: number;
                    unit: string;
                    line_total: number;
                  }) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                      <span className="min-w-0 break-words">{item.product_name} × {item.quantity} {item.unit}</span>
                      <span className="whitespace-nowrap font-medium">{money(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-lg font-semibold">{money(order.subtotal)}</p>
              </div>

              <div className="grid gap-3">
                {order.status === "pending_admin" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form action={approveOrderAction}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <SubmitButton pendingLabel="กำลังอนุมัติ..." className="w-full">
                        อนุมัติ
                      </SubmitButton>
                    </form>
                    <form action={rejectOrderAction} className="grid gap-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <Input name="reason" placeholder="เหตุผล" />
                      <SubmitButton variant="danger" pendingLabel="กำลังปฏิเสธ..." className="w-full">
                        ปฏิเสธ
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}

                {["approved", "packing", "ready_to_ship"].includes(order.status) ? (
                  <form action={uploadOrderPhotoAction} encType="multipart/form-data" className="grid gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <Field label="รูปสินค้าที่แพ็คแล้ว">
                      <FileUploadPreview
                        name="photo"
                        accept="image/*"
                        capture="environment"
                        required
                        hint="ถ่ายให้เห็นสินค้าที่แพ็คพร้อมส่ง"
                      />
                    </Field>
                    <Input name="caption" placeholder="คำอธิบายรูป" />
                    <SubmitButton variant="secondary" pendingLabel="กำลังอัปโหลด...">
                      อัปโหลดรูป
                    </SubmitButton>
                  </form>
                ) : null}

                {["approved", "packing", "ready_to_ship", "shipping"].includes(order.status) ? (
                  <form action={updateOrderStatusAction} className="grid gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <Field label="อัปเดตสถานะ">
                      <Select name="status" defaultValue={order.status}>
                        {nextStatuses.map((status) => (
                          <option key={status} value={status}>{orderStatusLabel(status)}</option>
                        ))}
                      </Select>
                    </Field>
                    <Input name="note" placeholder="หมายเหตุ" />
                    <SubmitButton variant="secondary" pendingLabel="กำลังอัปเดต...">
                      อัปเดต
                    </SubmitButton>
                  </form>
                ) : null}

                <p className="text-xs text-muted">
                  รูปแพ็คแล้ว: {(order.order_photos ?? []).length} ไฟล์
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
