import { Card } from "@/components/ui/card";
import { getSettings } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">ตั้งค่าระบบ</h2>
      <Card>
        <h3 className="font-semibold">การตั้งค่าระบบ</h3>
        <div className="mt-3 grid gap-3">
          {settings.map((setting) => (
            <div key={setting.key} className="rounded-md border border-border p-3">
              <p className="font-mono text-sm font-semibold">{setting.key}</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs">
                {JSON.stringify(setting.value, null, 2)}
              </pre>
              <p className="mt-2 text-sm text-muted">{setting.description}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">หมายเหตุ LINE OA</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          MVP stores notification events in <code>line_notification_outbox</code>. Future work:
          connect LINE Login, map <code>line_user_id</code>, add an Edge Function worker, and send
          order/payment status notifications through LINE Official Account.
        </p>
      </Card>
    </div>
  );
}
