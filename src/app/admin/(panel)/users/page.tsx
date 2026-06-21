import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const permissionGroups = [
  {
    role: "ผู้ดูแลระบบ",
    description: "ใช้สำหรับคนที่ดูแลหลังบ้านและตัดสินใจเรื่องสำคัญของระบบ",
    permissions: [
      "เพิ่ม แก้ไข และปิดการขายสินค้า",
      "เพิ่มสต็อก ตัดสต็อก และดูประวัติการเคลื่อนไหว",
      "อนุมัติหรือปฏิเสธออเดอร์ลูกค้า",
      "ตรวจสลิปและบันทึกยอดชำระ",
      "ดูแลบัญชีลูกค้า ส่วนลด และยอดค้างชำระ",
      "จัดการสิทธิ์ทีมงานและตั้งค่าระบบ",
    ],
  },
  {
    role: "ทีมจัดสินค้า",
    description: "ใช้สำหรับทีมคลังหรือโรงงานที่ช่วยอัปเดตสถานะการจัดสินค้า",
    permissions: [
      "ดูรายการออเดอร์ที่ต้องจัดสินค้า",
      "อัปโหลดรูปสินค้าที่จัดเตรียมแล้ว",
      "อัปเดตสถานะการแพ็กและการจัดส่ง",
    ],
  },
  {
    role: "ลูกค้า",
    description: "ใช้สำหรับผู้ซื้อสินค้าที่เข้ามาสั่งซื้อและติดตามออเดอร์",
    permissions: [
      "ดูสินค้าและเพิ่มลงตะกร้า",
      "ส่งออเดอร์ให้ทีมงานอนุมัติ",
      "แจ้งชำระเงินและอัปโหลดสลิป",
      "ติดตามสถานะออเดอร์และยอดค้างชำระของตัวเอง",
    ],
  },
];

export default async function AdminUsersPage() {
  const profiles = await getProfiles();

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">สิทธิ์ผู้ใช้งาน</h2>
        <p className="mt-1 text-sm text-muted">
          สรุปสิทธิ์แต่ละประเภทเป็นภาษาที่ทีมงานอ่านเข้าใจง่าย
        </p>
      </div>

      <Card>
        <h3 className="font-semibold">ตารางสิทธิ์การใช้งาน</h3>
        <div className="mt-3 grid gap-3">
          {permissionGroups.map((group) => (
            <div key={group.role} className="rounded-md border border-border bg-white/58 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{group.role}</p>
                  <p className="mt-1 text-sm text-muted">{group.description}</p>
                </div>
              </div>
              <ul className="mt-3 grid gap-2 text-sm text-foreground">
                {group.permissions.map((permission) => (
                  <li key={permission} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">ผู้ใช้งานในระบบ</h3>
        <div className="mt-3 grid gap-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {profile.company_name ?? profile.full_name ?? profile.email}
                </p>
                <p className="break-words text-sm text-muted">{profile.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
                  {accountStatusLabel(profile.status)}
                </Badge>
                <Badge>{roleLabel(profile.role)}</Badge>
                {profile.is_owner ? <Badge tone="accent">เจ้าของระบบ</Badge> : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
