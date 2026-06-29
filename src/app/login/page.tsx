import Link from "next/link";
import { signInAction, signInWithLineAction, signUpAction } from "@/app/actions/auth";
import { Icon } from "@/components/nak/icon";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; email?: string }>;
}) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";

  return (
    <main className="motion-page min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-md place-items-center">
        <section className="w-full">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl text-2xl font-extrabold text-white"
              style={{ background: "var(--p)", boxShadow: "0 10px 24px -8px var(--p)" }}
            >
              N
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                NAK <span style={{ color: "var(--p)" }}>Wholesale</span>
              </h1>
              <p className="text-xs text-muted">ขายส่งครบ จบในที่เดียว</p>
            </div>
          </div>

          <Card className="w-full p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">{isSignup ? "สมัครบัญชีลูกค้า" : "เข้าสู่ระบบ"}</h2>

            {params.error ? (
              <div className="mb-4 rounded-[var(--r-sm)] border border-[#f3c8c2] bg-[#fbe6e3] p-3 text-sm text-[#b42318]">
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
                {isSignup ? "ส่งคำขอสมัคร" : "เข้าสู่ระบบ"}
                <Icon name="arrowR" size={18} stroke={2.2} />
              </SubmitButton>
            </form>

            {!isSignup ? (
              <form action={signInWithLineAction} className="mt-3">
                <SubmitButton
                  className="w-full text-white hover:brightness-[1.03]"
                  style={{ background: "#06c755", boxShadow: "0 10px 24px -8px rgba(6,199,85,0.5)" }}
                  pendingLabel="กำลังเปิด LINE..."
                >
                  เข้าสู่ระบบด้วย LINE
                </SubmitButton>
              </form>
            ) : null}

            <div className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">
              {isSignup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
              <Link href={isSignup ? "/login" : "/login?mode=signup"} className="font-bold" style={{ color: "var(--p)" }}>
                {isSignup ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
              </Link>
            </div>
            <div className="mt-2 text-sm text-muted">
              เป็นทีมงาน?{" "}
              <Link href="/admin/login" className="font-bold" style={{ color: "var(--p)" }}>
                เข้าสู่ระบบทีมงาน
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
