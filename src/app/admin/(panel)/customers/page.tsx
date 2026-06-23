import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { Avatar, PageHead } from "@/components/nak/ui";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProfileRecord = Awaited<ReturnType<typeof getProfiles>>[number];

function profileName(profile: ProfileRecord) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

function matches(profile: ProfileRecord, query: string) {
  if (!query) return true;
  return [profile.company_name, profile.full_name, profile.email, profile.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase());
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin();
  const profiles = await getProfiles();
  const query = String(params.q ?? "").trim();
  const customers = profiles.filter((p) => p.role === "customer" && p.status !== "pending");
  const filtered = customers.filter((p) => matches(p, query));

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="ลูกค้า" sub={`${customers.length} บัญชีที่อนุมัติแล้ว`} />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      <form action="/admin/customers" method="get" className="ad-search">
        <Icon name="search" size={18} stroke={2.2} style={{ color: "var(--muted)" }} />
        <input name="q" defaultValue={query} placeholder="ค้นหาลูกค้า ชื่อ หรือเบอร์" />
        <button type="submit" style={{ border: "none", background: "transparent", color: "var(--p)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ค้นหา
        </button>
      </form>

      <div className="ad-card" style={{ padding: 6 }}>
        {filtered.map((profile, i) => (
          <Link
            key={profile.id}
            href={`/admin/customers/${profile.id}`}
            className="ad-press"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: 11,
              borderRadius: "var(--r-sm)",
              borderBottom: i < filtered.length - 1 ? "1px solid var(--line)" : "none",
              textAlign: "left",
            }}
          >
            <Avatar name={profileName(profile)} tone="neutral" size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profileName(profile)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.phone || profile.email || "—"}
              </div>
            </div>
            {Number(profile.debt_balance ?? 0) > 0 ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a35a10", whiteSpace: "nowrap" }}>{money(profile.debt_balance)}</span>
            ) : null}
            <Icon name="chevR" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
          </Link>
        ))}
        {filtered.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ไม่พบลูกค้า</div> : null}
      </div>
    </div>
  );
}
