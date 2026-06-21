import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { signInAdminAction, signUpStaffAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";

  return (
    <main className="motion-page min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-md place-items-center">
        <section className="w-full">
          <Card className="w-full p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-normal text-accent">NAK Admin</p>
              <h1 className="mt-1 text-2xl font-semibold">
                {isSignup ? "สมัครบัญชีทีมงาน" : "เข้าสู่ระบบทีมงาน"}
              </h1>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex min-h-14 items-center gap-2 rounded-lg border border-white/70 bg-white/62 px-3 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-white/82 hover:text-foreground"
              >
                <UserRound className="h-4 w-4" />
                ฝั่งลูกค้า
              </Link>
              <Link
                href="/admin/login"
                className="flex min-h-14 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-teal-100"
              >
                <ShieldCheck className="h-4 w-4" />
                ฝั่งทีมงาน
              </Link>
            </div>

            {isSignup ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-warning">
                สมัครทีมงานแล้วจะยังเข้า Admin Panel ไม่ได้ ต้องรอแอดมินอนุมัติและกำหนดสิทธิ์ก่อน
              </div>
            ) : null}

            {params.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">
                {params.error}
              </div>
            ) : null}

            <form action={isSignup ? signUpStaffAction : signInAdminAction} className="grid gap-4">
              {isSignup ? (
                <>
                  <Field label="ชื่อทีมงาน">
                    <Input name="full_name" autoComplete="name" required />
                  </Field>
                  <Field label="ทีม / แผนก">
                    <Input name="company_name" autoComplete="organization" placeholder="เช่น คลังสินค้า" />
                  </Field>
                  <Field label="เบอร์โทร">
                    <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" required />
                  </Field>
                </>
              ) : null}
              <Field label="อีเมล">
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
              <Field label="รหัสผ่าน">
                <Input
                  name="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </Field>
              <SubmitButton pendingLabel={isSignup ? "กำลังส่งคำขอ..." : "กำลังเข้าสู่ระบบ..."}>
                {isSignup ? "ส่งคำขอสมัครทีมงาน" : "เข้าสู่ระบบทีมงาน"}
                <ArrowRight className="h-4 w-4" />
              </SubmitButton>
            </form>

            <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
              {isSignup ? "มีบัญชีทีมงานแล้ว?" : "ต้องการขอสิทธิ์ทีมงาน?"}{" "}
              <Link
                href={isSignup ? "/admin/login" : "/admin/login?mode=signup"}
                className="font-semibold text-accent"
              >
                {isSignup ? "เข้าสู่ระบบทีมงาน" : "สมัครทีมงาน"}
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
