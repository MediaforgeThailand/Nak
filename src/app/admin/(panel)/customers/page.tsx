import Link from "next/link";
import { BadgePercent, ChevronRight, Phone, Search, UserRound, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, money } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProfileRecord = Awaited<ReturnType<typeof getProfiles>>[number];

function includesSearch(profile: ProfileRecord, query: string) {
  if (!query) return true;
  const haystack = [profile.company_name, profile.full_name, profile.email, profile.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function profileName(profile: ProfileRecord) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

function CustomerRow({ profile }: { profile: ProfileRecord }) {
  return (
    <Link
      href={`/admin/customers/${profile.id}`}
      className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/64 p-3 transition-colors duration-200 hover:bg-white/82"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/70 bg-white/76 text-accent">
        <UserRound className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{profileName(profile)}</p>
          <Badge tone={profile.status === "approved" ? "success" : "danger"}>
            {accountStatusLabel(profile.status)}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-accent" />
            {profile.phone || "ไม่มีเบอร์"}
          </span>
          <span className="inline-flex items-center gap-1">
            <WalletCards className="h-3.5 w-3.5 text-warning" />
            {money(profile.debt_balance)}
          </span>
          <span className="inline-flex items-center gap-1">
            <BadgePercent className="h-3.5 w-3.5 text-success" />
            {money(profile.per_item_discount)} / ชิ้น
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
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
  const customers = profiles.filter(
    (profile) => profile.role === "customer" && profile.status !== "pending" && profile.signup_scope !== "staff",
  );
  const filteredCustomers = customers.filter((profile) => includesSearch(profile, query));

  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-xl font-semibold">จัดการลูกค้า</h2>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div>
      ) : null}

      <Card className="p-3">
        <form action="/admin/customers" className="grid gap-2 sm:grid-cols-[1fr_auto]" method="get">
          <Field label="ค้นหาลูกค้า">
            <Input name="q" defaultValue={query} placeholder="ชื่อ / เบอร์ / อีเมล" autoComplete="off" />
          </Field>
          <Button type="submit" variant="secondary" className="self-end">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
        </form>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">ลูกค้า {filteredCustomers.length} รายการ</p>
        {query ? <Badge tone="accent">ค้นหา: {query}</Badge> : <Badge>{customers.length} ทั้งหมด</Badge>}
      </div>

      <div className="grid gap-2">
        {filteredCustomers.map((profile) => (
          <CustomerRow key={profile.id} profile={profile} />
        ))}

        {filteredCustomers.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-muted">ไม่พบลูกค้า</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
