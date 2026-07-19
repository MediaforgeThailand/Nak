import Link from "next/link";
import { signInAdminAction, signInWithLineAdminAction, signUpStaffAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/nak/brand-mark";
import { Icon } from "@/components/nak/icon";
import { LiffAutoLogin } from "@/components/line/liff-auto-login";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; email?: string }>;
}) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";

  return (
    <main className="motion-page min-h-screen px-4 py-6 sm:py-10">
      <LiffAutoLogin />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-md place-items-center">
        <section className="w-full">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <BrandMark size={56} />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                NRV <span style={{ color: "var(--p)" }}>Admin</span>
              </h1>
              <p className="text-xs text-muted">ระบบหลังบ้าน</p>
            </div>
          </div>

          <Card className="w-full p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">{isSignup ? "สมัครบัญชีทีมงาน" : "เข้าสู่ระบบทีมงาน"}</h2>

            <div className="mb-5 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-muted transition-colors duration-200 hover:text-[var(--ink)]"
              >
                <Icon name="user" size={16} stroke={2.2} />
                ฝั่งลูกค้า
              </Link>
              <span
                className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] px-3 text-sm font-bold"
                style={{ background: "var(--p-soft)", color: "var(--p-deep)" }}
              >
                <Icon name="shield" size={16} stroke={2.2} />
                ฝั่งทีมงาน
              </span>
            </div>

            {isSignup ? (
              <div className="mb-4 rounded-[var(--r-sm)] border border-[#f3dcb6] bg-[#fbeedd] p-3 text-sm leading-6 text-[#a35a10]">
                สมัครทีมงานแล้วจะยังเข้าระบบหลังบ้านไม่ได้ ต้องรอแอดมินอนุมัติและกำหนดสิทธิ์ก่อน
              </div>
            ) : null}

            {params.error ? (
              <div className="mb-4 rounded-[var(--r-sm)] border border-[#f3c8c2] bg-[#fbe6e3] p-3 text-sm text-[#b42318]">
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
                <Input name="email" type="email" autoComplete="email" defaultValue={params.email ?? ""} required />
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
              <SubmitButton pendingLabel={isSignup ? "กำลังส่งคำขอ..." : "กำลังเข้าสู่ระบบ..."} className="w-full">
                {isSignup ? "ส่งคำขอสมัครทีมงาน" : "เข้าสู่ระบบทีมงาน"}
                <Icon name="arrowR" size={18} stroke={2.2} />
              </SubmitButton>
            </form>

            {!isSignup ? (
              <form action={signInWithLineAdminAction} className="mt-3">
                <SubmitButton
                  className="w-full text-white hover:brightness-[1.03]"
                  style={{ background: "#06c755", boxShadow: "0 10px 24px -8px rgba(6,199,85,0.5)" }}
                  pendingLabel="กำลังเปิด LINE..."
                >
                  เข้าสู่ระบบทีมงานด้วย LINE
                </SubmitButton>
              </form>
            ) : null}

            <div className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">
              {isSignup ? "มีบัญชีทีมงานแล้ว?" : "ต้องการขอสิทธิ์ทีมงาน?"}{" "}
              <Link href={isSignup ? "/admin/login" : "/admin/login?mode=signup"} className="font-bold" style={{ color: "var(--p)" }}>
                {isSignup ? "เข้าสู่ระบบทีมงาน" : "สมัครทีมงาน"}
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
