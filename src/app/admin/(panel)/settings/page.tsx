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
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
