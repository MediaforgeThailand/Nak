import Link from "next/link";
import { signInAction, signUpAction } from "@/app/actions/auth";
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
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">
            Nak Customer
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {isSignup ? "สมัครบัญชีลูกค้า" : "เข้าสู่ระบบ"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isSignup
              ? "หลังสมัคร แอดมินต้องอนุมัติก่อนจึงจะสั่งสินค้าได้"
              : "สำหรับผู้ซื้อสินค้าเท่านั้น"}
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {params.error}
          </div>
        ) : null}

        <div className="mb-4 rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
          Prototype นี้ยังใช้ email/password ชั่วคราว ก่อนเชื่อม LINE Login จริง
        </div>

        <Card>
          <form action={isSignup ? signUpAction : signInAction} className="grid gap-4">
            {isSignup ? (
              <>
                <Field label="ชื่อผู้ติดต่อ">
                  <Input name="full_name" required />
                </Field>
                <Field label="ชื่อบริษัท / ร้านค้า">
                  <Input name="company_name" required />
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
            </SubmitButton>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <Link
            href={isSignup ? "/login" : "/login?mode=signup"}
            className="font-semibold text-accent"
          >
            {isSignup ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          เป็น admin หรือทีมงาน?{" "}
          <Link href="/admin/login" className="font-semibold text-accent">
            ไปหน้า Admin Login
          </Link>
        </p>
      </div>
    </main>
  );
}
