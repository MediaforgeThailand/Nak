import Link from "next/link";
import { approveUserAction, suspendUserAction } from "@/app/actions/admin";
import { AdBadge, Avatar, PageHead } from "@/components/nak/ui";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProfileRecord = Awaited<ReturnType<typeof getProfiles>>[number];

function profileName(profile: ProfileRecord) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

function ReqRow({
  title,
  sub,
  badge,
  children,
}: {
  title: string;
  sub: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 11, display: "grid", gap: 9 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{sub}</div>
        {badge ? <div style={{ marginTop: 6 }}>{badge}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { profile: currentProfile } = await requireAdmin();
  const profiles = await getProfiles();

  const pendingCustomers = profiles.filter((p) => p.status === "pending" && p.signup_scope !== "staff");
  // Staff requests: brand-new staff signups, plus approved customers that asked
  // for backend access (marked via signup_scope on the backend LINE login).
  const pendingStaff = profiles.filter(
    (p) =>
      (p.status === "pending" && p.signup_scope === "staff") ||
      (p.status === "approved" && p.role === "customer" && p.signup_scope === "staff"),
  );
  const customers = profiles.filter((p) => p.role === "customer" && p.status !== "pending");
  const staff = profiles.filter((p) => p.status !== "pending" && ["admin", "factory_staff"].includes(p.role));

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="สิทธิ์และทีมงาน" sub="คำขอเปิดบัญชี และสิทธิ์ผู้ใช้งาน" />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>คำขอรออนุมัติ</h3>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>คำขอลูกค้า ({pendingCustomers.length})</div>
        {pendingCustomers.map((p) => (
          <ReqRow key={p.id} title={profileName(p)} sub={`${p.phone ?? "—"} · ส่งคำขอ ${compactDate(p.created_at)}`}>
            <form action={approveUserAction}>
              <input type="hidden" name="user_id" value={p.id} />
              <input type="hidden" name="return_to" value="/admin/users" />
              <input type="hidden" name="role" value="customer" />
              <SubmitButton variant="secondary" pendingLabel="..." className="w-full" disabled={p.id === currentProfile.id}>
                อนุมัติลูกค้า
              </SubmitButton>
            </form>
          </ReqRow>
        ))}
        {pendingCustomers.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>ยังไม่มีคำขอลูกค้า</p> : null}

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginTop: 4 }}>คำขอทีมงาน ({pendingStaff.length})</div>
        {pendingStaff.map((p) => {
          const alsoCustomer = p.status === "approved" && p.role === "customer";
          return (
            <ReqRow
              key={p.id}
              title={profileName(p)}
              sub={[p.email, p.phone].filter(Boolean).join(" · ") || "—"}
              badge={alsoCustomer ? <AdBadge tone="accent">มีสิทธิ์เป็นลูกค้าอยู่แล้ว</AdBadge> : undefined}
            >
              <form action={approveUserAction} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                <input type="hidden" name="user_id" value={p.id} />
                <input type="hidden" name="return_to" value="/admin/users" />
                <Select name="role" defaultValue={alsoCustomer ? "admin" : "factory_staff"} disabled={p.id === currentProfile.id}>
                  <option value="factory_staff">ทีมจัดสินค้า</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </Select>
                <SubmitButton variant="secondary" pendingLabel="..." disabled={p.id === currentProfile.id}>
                  อนุมัติ
                </SubmitButton>
              </form>
            </ReqRow>
          );
        })}
        {pendingStaff.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>ยังไม่มีคำขอทีมงาน</p> : null}
      </div>

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 4 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>บัญชีลูกค้า ({customers.length})</h3>
        {customers.map((c, i) => (
          <Link
            key={c.id}
            href={`/admin/customers/${c.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 0",
              borderBottom: i < customers.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <Avatar name={profileName(c)} tone="neutral" size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName(c)}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email || "—"}</div>
            </div>
            <AdBadge tone={c.status === "approved" ? "success" : "danger"}>{accountStatusLabel(c.status)}</AdBadge>
          </Link>
        ))}
        {customers.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0" }}>ยังไม่มีบัญชีลูกค้า</p> : null}
      </div>

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>บัญชีทีมงาน ({staff.length})</h3>
        {staff.map((s) => (
          <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 11, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar name={profileName(s)} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{profileName(s)}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.email || "—"}</div>
              </div>
              <AdBadge tone={s.is_owner ? "accent" : "neutral"}>{s.is_owner ? "เจ้าของ" : roleLabel(s.role)}</AdBadge>
            </div>
            {s.id !== currentProfile.id ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <form action={approveUserAction} style={{ display: "grid", gap: 6 }}>
                  <input type="hidden" name="user_id" value={s.id} />
                  <input type="hidden" name="return_to" value="/admin/users" />
                  <Select name="role" defaultValue={s.role}>
                    <option value="factory_staff">ทีมจัดสินค้า</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </Select>
                  <SubmitButton variant="secondary" pendingLabel="...">
                    บันทึกสิทธิ์
                  </SubmitButton>
                </form>
                <form action={suspendUserAction} style={{ display: "grid", alignItems: "end" }}>
                  <input type="hidden" name="user_id" value={s.id} />
                  <input type="hidden" name="return_to" value="/admin/users" />
                  <SubmitButton variant="danger" pendingLabel="..." className="w-full">
                    ระงับ
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <AdBadge tone="accent">กำลังใช้งาน</AdBadge>
            )}
          </div>
        ))}
        {staff.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0" }}>ยังไม่มีบัญชีทีมงาน</p> : null}
      </div>
    </div>
  );
}
