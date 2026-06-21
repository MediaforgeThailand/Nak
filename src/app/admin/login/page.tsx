import Link from "next/link";
import { ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck, Store } from "lucide-react";
import { signInAdminAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="motion-page min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="grid gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-accent">
              NAK Operations
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              จัดการคลัง ออเดอร์ และบัญชีลูกค้า
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              หลังบ้านสำหรับทีมงานที่ดูแลสินค้า สต็อก การอนุมัติออเดอร์ การรับชำระ และสิทธิ์ผู้ใช้งาน
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <ClipboardCheck className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">อนุมัติออเดอร์</p>
              <p className="mt-1 text-xs leading-5 text-muted">ตรวจรายการก่อนบันทึกยอดค้าง</p>
            </div>
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <Store className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">ดูแลสินค้า</p>
              <p className="mt-1 text-xs leading-5 text-muted">เพิ่มรูป หมวดหมู่ ราคา และสต็อก</p>
            </div>
            <div className="motion-surface rounded-lg border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <p className="mt-3 font-semibold">สิทธิ์เฉพาะทีม</p>
              <p className="mt-1 text-xs leading-5 text-muted">จำกัดการเข้าถึงตามบทบาท</p>
            </div>
          </div>
        </section>

        <section>
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-accent">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold">เข้าสู่ระบบหลังบ้าน</h2>
              <p className="mt-1 text-sm text-muted">สำหรับผู้ดูแลระบบและทีมงานที่ได้รับอนุมัติแล้ว</p>
            </div>

            {params.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">
                {params.error}
              </div>
            ) : null}

            <form action={signInAdminAction} className="grid gap-4">
              <Field label="อีเมล">
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
              <Field label="รหัสผ่าน">
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
              </Field>
              <SubmitButton pendingLabel="กำลังเข้าสู่ระบบ...">
                เข้าสู่ระบบหลังบ้าน
                <ArrowRight className="h-4 w-4" />
              </SubmitButton>
            </form>

            <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
              เป็นผู้ซื้อสินค้า?{" "}
              <Link href="/login" className="font-semibold text-accent">
                ไปหน้า login ลูกค้า
              </Link>
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
