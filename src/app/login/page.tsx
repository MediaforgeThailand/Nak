import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signInAction, signInWithLineAction, signUpAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({
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
              <h1 className="text-2xl font-semibold">
                {isSignup ? "สมัครบัญชี" : "เข้าสู่ระบบ"}
              </h1>
            </div>

            {params.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">
                {params.error}
              </div>
            ) : null}

            <form action={isSignup ? signUpAction : signInAction} className="grid gap-4">
              {isSignup ? (
                <>
                  <Field label="ชื่อผู้ติดต่อ">
                    <Input name="full_name" autoComplete="name" required />
                  </Field>
                  <Field label="ชื่อบริษัท / ร้านค้า">
                    <Input name="company_name" autoComplete="organization" required />
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
                {isSignup ? "ส่งคำขอสมัคร" : "เข้าสู่ระบบ"}
                <ArrowRight className="h-4 w-4" />
              </SubmitButton>
            </form>

            {!isSignup ? (
              <form action={signInWithLineAction} className="mt-3">
                <SubmitButton
                  className="w-full border-[#06c755]/40 bg-[#06c755] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_28px_rgba(6,199,85,0.22)] hover:bg-[#05b84e]"
                  pendingLabel="กำลังเปิด LINE..."
                >
                  LINE Login
                </SubmitButton>
              </form>
            ) : null}

            <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
              {isSignup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
              <Link
                href={isSignup ? "/login" : "/login?mode=signup"}
                className="font-semibold text-accent"
              >
                {isSignup ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
