import Link from "next/link";
import { ArrowRight, ShieldCheck, ShoppingBag, Store, UserPlus } from "lucide-react";
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
    <main className="motion-page min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="grid gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-accent">
              NAK Wholesale
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              สั่งสินค้าแฟชั่นเข้าร้านได้เร็วขึ้น
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              เข้าสู่ระบบเพื่อดูสินค้าในคลัง ราคาส่วนลดเฉพาะบัญชี ติดตามออเดอร์ และแจ้งชำระเงินในที่เดียว
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <ShoppingBag className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">Catalog สด</p>
              <p className="mt-1 text-xs leading-5 text-muted">เห็นสต็อกและราคาในฐานข้อมูลจริง</p>
            </div>
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">อนุมัติเป็นขั้นตอน</p>
              <p className="mt-1 text-xs leading-5 text-muted">ออเดอร์และสลิปผ่านทีมงานก่อนบันทึกยอด</p>
            </div>
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <Store className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">เหมาะกับร้านค้า</p>
              <p className="mt-1 text-xs leading-5 text-muted">ดูยอดค้างและรายการย้อนหลังได้ชัดเจน</p>
            </div>
          </div>
        </section>

        <section>
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-accent">
                {isSignup ? <UserPlus className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
              </div>
              <h2 className="mt-4 text-2xl font-semibold">
                {isSignup ? "สมัครบัญชีลูกค้า" : "เข้าสู่ระบบลูกค้า"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isSignup
                  ? "ส่งข้อมูลร้านค้าเพื่อให้แอดมินอนุมัติก่อนเริ่มสั่งสินค้า"
                  : "สำหรับผู้ซื้อสินค้าและร้านค้าที่ได้รับอนุมัติแล้ว"}
              </p>
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

            <div className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-muted">
              <p>
                {isSignup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
                <Link
                  href={isSignup ? "/login" : "/login?mode=signup"}
                  className="font-semibold text-accent"
                >
                  {isSignup ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
                </Link>
              </p>
              <p>
                เป็น admin หรือทีมงาน?{" "}
                <Link href="/admin/login" className="font-semibold text-accent">
                  ไปหน้า Admin Login
                </Link>
              </p>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
