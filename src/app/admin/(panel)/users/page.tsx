import Link from "next/link";
import { CheckCircle2, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { approveUserAction, suspendUserAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const permissionGroups = [
  {
    title: "ฝั่งลูกค้า",
    Icon: UserRound,
    description: "ใช้สำหรับผู้ซื้อสินค้า เข้าได้เฉพาะหน้าสินค้า ออเดอร์ โปรไฟล์ และการชำระเงิน",
    items: [
      "สั่งสินค้าและติดตามสถานะออเดอร์",
      "แจ้งชำระเงินและดูประวัติธุรกรรมของตัวเอง",
      "ไม่มีสิทธิ์เข้า Admin Panel",
    ],
  },
  {
    title: "ฝั่งทีมงาน",
    Icon: ShieldCheck,
    description: "ใช้สำหรับคนที่ต้องทำงานหลังบ้าน เช่น ดูออเดอร์ แพ็กสินค้า ตรวจสลิป หรือดูแลระบบ",
    items: [
      "ทีมจัดสินค้าเข้าเฉพาะงานออเดอร์และการจัดส่ง",
      "ผู้ดูแลระบบจัดการสินค้า สต็อก สลิป ลูกค้า และสิทธิ์",
      "บัญชีสมัครใหม่ยังเข้าไม่ได้จนกว่าแอดมินจะอนุมัติ",
    ],
  },
];

function profileName(profile: Awaited<ReturnType<typeof getProfiles>>[number]) {
  return profile.company_name ?? profile.full_name ?? profile.email;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { profile: currentProfile } = await requireAdmin();
  const profiles = await getProfiles();
  const pendingProfiles = profiles.filter((profile) => profile.status === "pending");
  const staffProfiles = profiles.filter(
    (profile) => profile.status !== "pending" && ["admin", "factory_staff"].includes(profile.role),
  );
  const customerProfiles = profiles.filter((profile) => profile.role === "customer" && profile.status !== "pending");

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">สิทธิ์และทีมงาน</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          หน้านี้ใช้แยกสิทธิ์ลูกค้ากับทีมงาน อนุมัติคำขอใหม่ และกำหนดว่าใครเข้า Admin Panel ได้
        </p>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {permissionGroups.map((group) => (
          <Card key={group.title}>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/78 text-accent">
                <group.Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{group.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{group.description}</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-sm">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">คำขอรออนุมัติ</h3>
            <p className="text-sm text-muted">
              บัญชีที่สมัครใหม่จะยังใช้งานไม่ได้ จนกว่าแอดมินจะเลือกสิทธิ์และอนุมัติ
            </p>
          </div>
          <Badge tone={pendingProfiles.length > 0 ? "warning" : "success"}>
            {pendingProfiles.length} รายการ
          </Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {pendingProfiles.map((profile) => {
            const isCurrentUser = profile.id === currentProfile.id;

            return (
              <div key={profile.id} className="rounded-lg border border-white/70 bg-white/58 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{profileName(profile)}</p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {profile.email} · {profile.phone ?? "ยังไม่มีเบอร์โทร"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="warning">{accountStatusLabel(profile.status)}</Badge>
                      <Badge>{roleLabel(profile.role)}</Badge>
                    </div>
                  </div>

                  <form action={approveUserAction} className="grid gap-2">
                    <input type="hidden" name="user_id" value={profile.id} />
                    <input type="hidden" name="return_to" value="/admin/users" />
                    <Select name="role" defaultValue="customer" disabled={isCurrentUser}>
                      <option value="customer">ลูกค้า</option>
                      <option value="factory_staff">ทีมจัดสินค้า</option>
                      <option value="admin">ผู้ดูแลระบบ</option>
                    </Select>
                    <SubmitButton
                      variant="secondary"
                      pendingLabel="กำลังอนุมัติ..."
                      disabled={isCurrentUser}
                    >
                      อนุมัติบัญชี
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}

          {pendingProfiles.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีคำขอรออนุมัติ</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">ทีมงานที่เข้า Admin Panel ได้</h3>
            <p className="text-sm text-muted">
              ปรับได้เฉพาะบัญชีทีมงาน ไม่ใช้หน้าจัดการลูกค้าในการเลื่อนสิทธิ์
            </p>
          </div>
          <Badge tone="accent">{staffProfiles.length} บัญชี</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {staffProfiles.map((profile) => {
            const isCurrentUser = profile.id === currentProfile.id;

            return (
              <div key={profile.id} className="rounded-lg border border-white/70 bg-white/58 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{profileName(profile)}</p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {profile.email} · {profile.phone ?? "ยังไม่มีเบอร์โทร"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={profile.status === "approved" ? "success" : "danger"}>
                        {accountStatusLabel(profile.status)}
                      </Badge>
                      <Badge>{roleLabel(profile.role)}</Badge>
                      {profile.is_owner ? <Badge tone="accent">เจ้าของระบบ</Badge> : null}
                      {isCurrentUser ? <Badge tone="accent">กำลังใช้งาน</Badge> : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <form action={approveUserAction} className="grid gap-2">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="return_to" value="/admin/users" />
                      <Select name="role" defaultValue={profile.role} disabled={isCurrentUser}>
                        <option value="factory_staff">ทีมจัดสินค้า</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                      </Select>
                      <SubmitButton
                        variant="secondary"
                        pendingLabel="กำลังบันทึก..."
                        disabled={isCurrentUser}
                      >
                        บันทึกสิทธิ์
                      </SubmitButton>
                    </form>
                    <form action={suspendUserAction}>
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="return_to" value="/admin/users" />
                      <SubmitButton
                        variant="danger"
                        pendingLabel="กำลังระงับ..."
                        className="w-full"
                        disabled={isCurrentUser}
                      >
                        ระงับ
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}

          {staffProfiles.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีบัญชีทีมงานที่ใช้งานได้</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">บัญชีลูกค้า</h3>
          </div>
          <ButtonLink href="/admin/customers" variant="secondary">
            ไปหน้าจัดการลูกค้า
          </ButtonLink>
        </div>
        <div className="mt-4 grid gap-2">
          {customerProfiles.slice(0, 8).map((profile) => (
            <Link
              key={profile.id}
              href={`/admin/customers?q=${encodeURIComponent(profile.phone ?? profile.email)}`}
              className="grid gap-2 rounded-lg border border-white/70 bg-white/58 p-3 transition-colors duration-200 hover:bg-white/78 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{profileName(profile)}</p>
                <p className="break-words text-sm text-muted">
                  {profile.email} · {profile.phone ?? "ยังไม่มีเบอร์โทร"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone={profile.status === "approved" ? "success" : "danger"}>
                  {accountStatusLabel(profile.status)}
                </Badge>
                <Badge>ลูกค้า</Badge>
              </div>
            </Link>
          ))}
          {customerProfiles.length > 8 ? (
            <p className="text-sm text-muted">
              แสดงล่าสุด 8 รายการ ใช้หน้าจัดการลูกค้าเพื่อค้นหาทั้งหมด
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
