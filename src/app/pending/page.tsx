import { Clock3 } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { profile } = await getCurrentProfile();

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
          <Button type="submit" variant="secondary">
            ออกจากระบบ
          </Button>
        </form>
      </Card>
    </main>
  );
}
