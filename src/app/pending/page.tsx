import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import {
  signInWithLineAction,
  signInWithLineAdminAction,
  signOutAdminAction,
  signOutCustomerAction,
  updatePendingProfileAction,
} from "@/app/actions/auth";
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
  searchParams: Promise<{ scope?: string; saved?: string; error?: string; auth?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "admin" ? "admin" : "customer";
  const { user, profile } = await getCurrentProfile(scope);
  const signOutAction = scope === "admin" ? signOutAdminAction : signOutCustomerAction;

  // No session but we landed here anyway — LINE authenticated the user and the
  // callback could not turn it into a session. Offer a one-tap retry instead of
  // a dead end.
  if (!user) {
    const lineRetryAction = scope === "admin" ? signInWithLineAdminAction : signInWithLineAction;
    const emailLoginPath = scope === "admin" ? "/admin/login" : "/login";
    const incomplete = params.auth === "line-incomplete";

    return (
      <main className="motion-page grid min-h-screen place-items-center px-4 py-8">
        <Card className="w-full max-w-lg p-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fbeedd] text-[#a35a10]">
            <Clock3 className="h-7 w-7" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-semibold text-accent">{scope === "admin" ? "NAK Admin" : "NAK Account"}</p>
            <h1 className="mt-2 text-2xl font-bold">
              {incomplete ? "ยืนยันการเข้าสู่ระบบอีกครั้ง" : "กรุณาเข้าสู่ระบบ"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {incomplete
                ? "เข้าสู่ระบบด้วย LINE ยังไม่สมบูรณ์ — กดลองอีกครั้งได้เลย ไม่ต้องสมัครใหม่ ข้อมูลบัญชีของคุณยังอยู่ครบ"
                : "เข้าสู่ระบบเพื่อดูสถานะบัญชีและการอนุมัติของคุณ"}
            </p>
          </div>

          <form action={lineRetryAction} className="mt-5">
            <SubmitButton
              className="w-full text-white hover:brightness-[1.03]"
              style={{ background: "#06c755", boxShadow: "0 10px 24px -8px rgba(6,199,85,0.5)" }}
              pendingLabel="กำลังเปิด LINE..."
            >
              เข้าสู่ระบบด้วย LINE อีกครั้ง
            </SubmitButton>
          </form>

          <p className="mt-3 text-center text-xs text-muted">เปิดผ่านแอป LINE จะเสถียรกว่าเปิดในเบราว์เซอร์</p>

          <div className="mt-4 border-t border-[var(--line)] pt-4 text-center text-sm text-muted">
            หรือเข้าสู่ระบบด้วย{" "}
            <Link href={emailLoginPath} className="font-bold" style={{ color: "var(--p)" }}>
              อีเมล
            </Link>
          </div>
        </Card>
      </main>
    );
  }
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const lineName = metadataValue(metadata, ["name", "display_name", "full_name"]);
  const defaultName = profile?.full_name || lineName;
  // LINE-only accounts get a synthetic internal email — never show it to the user.
  const displayEmail = profile?.email && !profile.email.endsWith("@line.nak.local") ? profile.email : null;
  const accountLabel = profile?.company_name || defaultName || displayEmail || "ผู้ใช้ LINE";

  // An already-approved customer that signed in on the backend → staff-access request.
  const isStaffRequestByCustomer =
    scope === "admin" && profile?.role === "customer" && profile?.status === "approved";

  if (isStaffRequestByCustomer && profile) {
    return (
      <main className="motion-page grid min-h-screen place-items-center px-4 py-8">
        <Card className="w-full max-w-lg p-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--p-soft)] text-[var(--p-deep)]">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-semibold text-accent">NAK Admin</p>
            <h1 className="mt-2 text-2xl font-bold">คำขอเป็นทีมงานรออนุมัติ</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              คุณเข้าสู่ระบบหลังบ้านด้วย<b> บัญชีลูกค้า</b> — ระบบส่งคำขอเป็นทีมงานให้แอดมินแล้ว
              เมื่อแอดมินอนุมัติ จะเข้าหลังบ้านได้ทันที
            </p>
          </div>

          <div className="mt-5 grid gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">ชื่อผู้ติดต่อ</span>
              <Badge tone="accent">บัญชีลูกค้า</Badge>
            </div>
            <p className="break-words font-semibold">{defaultName || "—"}</p>
            {displayEmail ? <p className="break-words text-sm text-muted">{displayEmail}</p> : null}
          </div>

          <Link
            href="/home"
            className="motion-surface mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--r-btn)] bg-[var(--p-soft)] px-4 font-bold text-[var(--p-deep)]"
          >
            กลับไปหน้าซื้อสินค้า
          </Link>

          <form action={signOutAction} className="mt-3">
            <SubmitButton variant="secondary" pendingLabel="กำลังออก..." className="w-full">
              ออกจากระบบ
            </SubmitButton>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="motion-page grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-lg p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fbeedd] text-[#a35a10]">
          <Clock3 className="h-7 w-7" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-accent">{scope === "admin" ? "NAK Admin" : "NAK Account"}</p>
          <h1 className="mt-2 text-2xl font-bold">บัญชียังรออนุมัติ</h1>
          {scope === "admin" ? (
            <p className="mt-2 text-sm text-muted">กรอกชื่อเพื่อส่งคำขอเป็นทีมงาน รอแอดมินอนุมัติและกำหนดสิทธิ์</p>
          ) : null}
        </div>

        {profile ? (
          <form action={updatePendingProfileAction} className="mt-5 grid gap-4">
            <input type="hidden" name="scope" value={scope} />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{accountLabel}</p>
                {displayEmail ? <p className="break-words text-sm text-muted">{displayEmail}</p> : null}
              </div>
              <Badge tone="warning">{accountStatusLabel(profile.status)}</Badge>
            </div>

            {params.saved ? <Badge tone="success">บันทึกข้อมูลแล้ว</Badge> : null}
            {params.error ? (
              <div className="rounded-[var(--r-sm)] border border-[#f3c8c2] bg-[#fbe6e3] p-3 text-sm text-[#b42318]">
                {params.error}
              </div>
            ) : null}

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
