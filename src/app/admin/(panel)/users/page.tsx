import Link from "next/link";
import { approveUserAction, deleteUserAction, setOwnerFlagAction } from "@/app/actions/admin";
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
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 11, display: "grid", gap: 9, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
        {badge ? <div style={{ marginTop: 6 }}>{badge}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
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
      {params.ok === "deleted" ? (
        <div style={{ background: "#e7f4ec", border: "1px solid #bfe3cd", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#1b7a4b", fontSize: 12.5 }}>
          ลบบัญชีถาวรแล้ว
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
              <form action={approveUserAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: 8, minWidth: 0 }}>
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
              minWidth: 0,
              maxWidth: "100%",
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
          <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 11, display: "grid", gap: 10, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <Avatar name={profileName(s)} size={34} />
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName(s)}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email || "—"}</div>
              </div>
              <AdBadge tone={s.is_owner ? "accent" : "neutral"}>{s.is_owner ? "เจ้าของ" : roleLabel(s.role)}</AdBadge>
            </div>
            {s.id !== currentProfile.id ? (
              <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 8, minWidth: 0 }}>
                {/* The owner account can't have its role changed or be suspended
                    from here — ownership must be transferred first. */}
                {!s.is_owner ? (
                  <form action={approveUserAction} style={{ display: "grid", gap: 6, minWidth: 0 }}>
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
                ) : null}
                {currentProfile.is_owner && s.role === "admin" && s.status === "approved" ? (
                  <form action={setOwnerFlagAction} style={{ display: "grid", alignItems: "end", minWidth: 0 }}>
                    <input type="hidden" name="user_id" value={s.id} />
                    <input type="hidden" name="make_owner" value={s.is_owner ? "0" : "1"} />
                    <SubmitButton variant="secondary" pendingLabel="..." className="w-full">
                      {s.is_owner ? "ถอนสิทธิ์เจ้าของ" : "ให้สิทธิ์เจ้าของ"}
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
              {/* Permanent delete — owner-only, behind a confirm, never on the owner
                  card. Replaces suspend as the way to remove a team account. */}
              {currentProfile.is_owner && !s.is_owner ? (
                <details style={{ marginTop: 2 }}>
                  <summary style={{ fontSize: 12.5, color: "#b42318", fontWeight: 700, cursor: "pointer" }}>
                    ลบบัญชีนี้ออกจากทีม
                  </summary>
                  <form action={deleteUserAction} style={{ marginTop: 8, display: "grid", gap: 7 }}>
                    <input type="hidden" name="user_id" value={s.id} />
                    <input type="hidden" name="return_to" value="/admin/users" />
                    <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                      ลบถาวร กู้คืนไม่ได้ — บัญชีนี้จะถูกลบออกจากระบบ (ออเดอร์และสลิปของลูกค้ายังอยู่ครบ เพียงแต่ไม่ผูกกับชื่อผู้ทำรายการนี้แล้ว) ใช้เมื่อพนักงานลาออกหรือเลิกใช้บัญชี
                    </p>
                    <SubmitButton variant="danger" pendingLabel="กำลังลบ...">
                      ยืนยันลบบัญชีนี้ถาวร
                    </SubmitButton>
                  </form>
                </details>
              ) : null}
              </>
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
