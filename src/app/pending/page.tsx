import { Clock3, Mail, ShieldCheck } from "lucide-react";
import { signOutAdminAction, signOutCustomerAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "admin" ? "admin" : "customer";
  const { profile } = await getCurrentProfile(scope);
  const signOutAction = scope === "admin" ? signOutAdminAction : signOutCustomerAction;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-warning">
          <Clock3 className="h-7 w-7" />
        </div>
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">NAK Account</p>
          <h1 className="mt-2 text-2xl font-semibold">บัญชียังรออนุมัติ</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            ทีมงานต้องตรวจสอบและอนุมัติบัญชีก่อนเริ่มใช้งานระบบสั่งสินค้า ยอดบัญชี และการแจ้งชำระเงิน
          </p>
        </div>

        {profile ? (
          <div className="mt-5 grid gap-3 rounded-lg border border-border bg-white/70 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-accent" />
              <div className="min-w-0">
                <p className="break-words font-medium">{profile.email}</p>
                <p className="text-muted">สถานะปัจจุบัน: {profile.status}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-accent" />
              <p className="text-muted">เมื่อได้รับอนุมัติแล้ว ระบบจะพาคุณเข้าสู่พื้นที่ใช้งานที่ถูกต้องตามบทบาท</p>
            </div>
          </div>
        ) : null}

        <form action={signOutAction} className="mt-5">
          <SubmitButton variant="secondary" pendingLabel="กำลังออก...">
            ออกจากระบบ
          </SubmitButton>
        </form>
      </Card>
    </main>
  );
}
