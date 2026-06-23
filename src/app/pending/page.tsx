import { Clock3 } from "lucide-react";
import { signOutAdminAction, signOutCustomerAction, updatePendingProfileAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentProfile } from "@/lib/auth";
import { accountStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function metadataValue(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return "";

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "admin" ? "admin" : "customer";
  const { user, profile } = await getCurrentProfile(scope);
  const signOutAction = scope === "admin" ? signOutAdminAction : signOutCustomerAction;
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const lineName = metadataValue(metadata, ["name", "display_name", "full_name"]);
  const defaultName = profile?.full_name || lineName;
  const accountLabel = profile?.company_name || defaultName || profile?.email || "ผู้ใช้ LINE";

  return (
    <main className="motion-page grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-lg p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-warning">
          <Clock3 className="h-7 w-7" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">NAK Account</p>
          <h1 className="mt-2 text-2xl font-semibold">บัญชียังรออนุมัติ</h1>
        </div>

        {profile ? (
          <form action={updatePendingProfileAction} className="mt-5 grid gap-4">
            <input type="hidden" name="scope" value={scope} />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white/70 p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{accountLabel}</p>
                {profile.email ? <p className="break-words text-sm text-muted">{profile.email}</p> : null}
              </div>
              <Badge tone="warning">{accountStatusLabel(profile.status)}</Badge>
            </div>

            {params.saved ? <Badge tone="success">บันทึกข้อมูลแล้ว</Badge> : null}
            {params.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

            <Field label="ชื่อผู้ติดต่อ">
              <Input name="full_name" autoComplete="name" defaultValue={defaultName} required />
            </Field>

            <Field label="บริษัท / ร้านค้า">
              <Input name="company_name" autoComplete="organization" defaultValue={profile.company_name ?? ""} />
            </Field>

            <Field label="เบอร์โทร">
              <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} />
            </Field>

            <SubmitButton pendingLabel="กำลังบันทึก..." className="w-full">
              บันทึกข้อมูล
            </SubmitButton>
          </form>
        ) : null}

        <form action={signOutAction} className="mt-5">
          <SubmitButton variant="secondary" pendingLabel="กำลังออก..." className="w-full">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </Card>
    </main>
  );
}
