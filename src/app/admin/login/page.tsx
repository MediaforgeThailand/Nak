import { signInAdminAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">
            Nak Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold">เข้าสู่ระบบหลังบ้าน</h1>
          <p className="mt-1 text-sm text-muted">
            สำหรับ admin และทีมงานเท่านั้น
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {params.error}
          </div>
        ) : null}

        <Card>
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
            <Button type="submit">เข้าสู่ระบบหลังบ้าน</Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-muted">
          เป็นผู้ซื้อสินค้า?{" "}
          <a href="/login" className="font-semibold text-accent">
            ไปหน้า login ลูกค้า
          </a>
        </p>
      </div>
    </main>
  );
}
