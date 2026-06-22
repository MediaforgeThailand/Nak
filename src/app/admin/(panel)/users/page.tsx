import Link from "next/link";
import { clsx } from "clsx";
import { ClipboardList, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { approveUserAction, suspendUserAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProfileRecord = Awaited<ReturnType<typeof getProfiles>>[number];
type UsersMode = "requests" | "accounts";
type AccountFilter = "customers" | "admins";

const modeMeta: Array<{
  key: UsersMode;
  label: string;
  Icon: typeof ClipboardList;
}> = [
  { key: "requests", label: "จัดการคำขอ", Icon: ClipboardList },
  { key: "accounts", label: "จัดการบัญชี", Icon: UsersRound },
];

const accountFilterMeta: Array<{
  key: AccountFilter;
  label: string;
  Icon: typeof UserRound;
}> = [
  { key: "customers", label: "ลูกค้า", Icon: UserRound },
  { key: "admins", label: "บัญชี Admin", Icon: ShieldCheck },
];

function activeMode(value: string | undefined): UsersMode {
  return value === "accounts" ? "accounts" : "requests";
}

function activeAccountFilter(value: string | undefined): AccountFilter {
  return value === "admins" ? "admins" : "customers";
}

function profileName(profile: ProfileRecord) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

function profileContact(profile: ProfileRecord) {
  return [profile.email || null, profile.phone || null].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูลติดต่อ";
}

function modeHref(mode: UsersMode) {
  return `/admin/users?mode=${mode}`;
}

function accountHref(filter: AccountFilter) {
  return `/admin/users?mode=accounts&account=${filter}`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white/45 p-4 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function CompactProfile({
  profile,
  badges,
  showRequestDate = false,
}: {
  profile: ProfileRecord;
  badges: React.ReactNode;
  showRequestDate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold">{profileName(profile)}</p>
      <p className="mt-0.5 break-words text-xs text-muted">{profileContact(profile)}</p>
      {showRequestDate ? (
        <p className="mt-1 text-xs text-muted">ส่งคำขอ {compactDate(profile.created_at)}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>
    </div>
  );
}

function RequestSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <Badge tone={count > 0 ? "warning" : "success"}>{count} รายการ</Badge>
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </Card>
  );
}

function PendingCustomerCard({ profile, isCurrentUser }: { profile: ProfileRecord; isCurrentUser: boolean }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/58 p-3">
      <div className="flex items-start justify-between gap-3">
        <CompactProfile
          profile={profile}
          showRequestDate
          badges={<Badge tone="warning">{accountStatusLabel(profile.status)}</Badge>}
        />
      </div>
      <form action={approveUserAction} className="mt-2">
        <input type="hidden" name="user_id" value={profile.id} />
        <input type="hidden" name="return_to" value="/admin/users" />
        <input type="hidden" name="role" value="customer" />
        <SubmitButton variant="secondary" pendingLabel="กำลังอนุมัติ..." className="w-full" disabled={isCurrentUser}>
          อนุมัติลูกค้า
        </SubmitButton>
      </form>
    </div>
  );
}

function PendingStaffCard({ profile, isCurrentUser }: { profile: ProfileRecord; isCurrentUser: boolean }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/58 p-3">
      <CompactProfile
        profile={profile}
        showRequestDate
        badges={<Badge tone="warning">{accountStatusLabel(profile.status)}</Badge>}
      />
      <form action={approveUserAction} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
        <input type="hidden" name="user_id" value={profile.id} />
        <input type="hidden" name="return_to" value="/admin/users" />
        <Select name="role" defaultValue="factory_staff" disabled={isCurrentUser}>
          <option value="factory_staff">ทีมจัดสินค้า</option>
          <option value="admin">ผู้ดูแลระบบ</option>
        </Select>
        <SubmitButton variant="secondary" pendingLabel="กำลังอนุมัติ..." disabled={isCurrentUser}>
          อนุมัติ
        </SubmitButton>
      </form>
    </div>
  );
}

function StaffCard({ profile, isCurrentUser }: { profile: ProfileRecord; isCurrentUser: boolean }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/58 p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CompactProfile
          profile={profile}
          badges={
            <>
              <Badge tone={profile.status === "approved" ? "success" : "danger"}>
                {accountStatusLabel(profile.status)}
              </Badge>
              <Badge>{roleLabel(profile.role)}</Badge>
              {profile.is_owner ? <Badge tone="accent">เจ้าของระบบ</Badge> : null}
              {isCurrentUser ? <Badge tone="accent">กำลังใช้งาน</Badge> : null}
            </>
          }
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <form action={approveUserAction} className="grid gap-2">
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value="/admin/users" />
            <Select name="role" defaultValue={profile.role} disabled={isCurrentUser}>
              <option value="factory_staff">ทีมจัดสินค้า</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </Select>
            <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก..." disabled={isCurrentUser}>
              บันทึก
            </SubmitButton>
          </form>
          <form action={suspendUserAction}>
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value="/admin/users" />
            <SubmitButton variant="danger" pendingLabel="กำลังระงับ..." className="w-full" disabled={isCurrentUser}>
              ระงับ
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomerLink({ profile }: { profile: ProfileRecord }) {
  return (
    <Link
      href={`/admin/customers/${profile.id}`}
      className="grid gap-2 rounded-lg border border-white/70 bg-white/58 p-3 transition-colors duration-200 hover:bg-white/78 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <CompactProfile
        profile={profile}
        badges={
          <>
            <Badge tone={profile.status === "approved" ? "success" : "danger"}>
              {accountStatusLabel(profile.status)}
            </Badge>
            <Badge>ลูกค้า</Badge>
          </>
        }
      />
    </Link>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; account?: string }>;
}) {
  const params = await searchParams;
  const selectedMode = activeMode(params.mode);
  const selectedAccountFilter = activeAccountFilter(params.account);
  const { profile: currentProfile } = await requireAdmin();
  const profiles = await getProfiles();

  const pendingCustomerProfiles = profiles.filter(
    (profile) => profile.status === "pending" && profile.signup_scope !== "staff",
  );
  const pendingStaffProfiles = profiles.filter(
    (profile) => profile.status === "pending" && profile.signup_scope === "staff",
  );
  const staffProfiles = profiles.filter(
    (profile) => profile.status !== "pending" && ["admin", "factory_staff"].includes(profile.role),
  );
  const customerProfiles = profiles.filter(
    (profile) => profile.role === "customer" && profile.status !== "pending" && profile.signup_scope !== "staff",
  );
  const visibleAccounts = selectedAccountFilter === "admins" ? staffProfiles : customerProfiles;

  const modeCounts: Record<UsersMode, number> = {
    requests: pendingCustomerProfiles.length + pendingStaffProfiles.length,
    accounts: customerProfiles.length + staffProfiles.length,
  };
  const accountCounts: Record<AccountFilter, number> = {
    customers: customerProfiles.length,
    admins: staffProfiles.length,
  };

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">สิทธิ์และทีมงาน</h2>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {modeMeta.map(({ key, label, Icon }) => {
          const isActive = selectedMode === key;
          return (
            <Link
              key={key}
              href={modeHref(key)}
              className={clsx(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_12px_24px_rgba(15,118,110,0.18)]"
                  : "border-white/70 bg-white/68 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-white/22 text-white" : "bg-surface-muted text-muted",
                )}
              >
                {modeCounts[key]}
              </span>
            </Link>
          );
        })}
      </div>

      {selectedMode === "requests" ? (
        <div className="grid gap-3">
          <RequestSection title="คำขอลูกค้า" count={pendingCustomerProfiles.length}>
            {pendingCustomerProfiles.map((profile) => (
              <PendingCustomerCard
                key={profile.id}
                profile={profile}
                isCurrentUser={profile.id === currentProfile.id}
              />
            ))}
            {pendingCustomerProfiles.length === 0 ? <EmptyState>ยังไม่มีคำขอลูกค้า</EmptyState> : null}
          </RequestSection>

          <RequestSection title="คำขอทีมงาน" count={pendingStaffProfiles.length}>
            {pendingStaffProfiles.map((profile) => (
              <PendingStaffCard key={profile.id} profile={profile} isCurrentUser={profile.id === currentProfile.id} />
            ))}
            {pendingStaffProfiles.length === 0 ? <EmptyState>ยังไม่มีคำขอทีมงาน</EmptyState> : null}
          </RequestSection>
        </div>
      ) : null}

      {selectedMode === "accounts" ? (
        <Card className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {accountFilterMeta.map(({ key, label, Icon }) => {
              const isActive = selectedAccountFilter === key;
              return (
                <Link
                  key={key}
                  href={accountHref(key)}
                  className={clsx(
                    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-white/70 bg-white/65 text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
                    {accountCounts[key]}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2">
            {selectedAccountFilter === "customers" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">บัญชีลูกค้า</h3>
                  <ButtonLink href="/admin/customers" variant="secondary">
                    จัดการลูกค้า
                  </ButtonLink>
                </div>
                {visibleAccounts.map((profile) => (
                  <CustomerLink key={profile.id} profile={profile} />
                ))}
              </>
            ) : (
              visibleAccounts.map((profile) => (
                <StaffCard key={profile.id} profile={profile} isCurrentUser={profile.id === currentProfile.id} />
              ))
            )}

            {visibleAccounts.length === 0 ? <EmptyState>ยังไม่มีบัญชีในหมวดนี้</EmptyState> : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
