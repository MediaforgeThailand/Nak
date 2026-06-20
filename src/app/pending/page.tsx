import { Clock3 } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="max-w-md text-center">
        <Clock3 className="mx-auto h-10 w-10 text-warning" />
        <h1 className="mt-4 text-2xl font-semibold">บัญชียังรออนุมัติ</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          แอดมินต้องอนุมัติบัญชีของคุณก่อนใช้งานระบบสั่งสินค้า ยอดหนี้ และการส่งสลิป
        </p>
        {profile ? (
          <div className="mt-4 rounded-md bg-surface-muted p-3 text-left text-sm">
            <p>{profile.email}</p>
            <p className="text-muted">สถานะ: {profile.status}</p>
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
