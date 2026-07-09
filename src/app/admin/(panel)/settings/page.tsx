import { testLineNotifyAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { AdBadge, PageHead, SectionCard } from "@/components/nak/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSettings } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

function renderValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function maskGroupId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const groupSetting = settings.find((s) => s.key === "line_group_id");
  const groupId = (groupSetting?.value as { id?: string } | null)?.id ?? null;

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="ตั้งค่าระบบ" sub="การแจ้งเตือน LINE และค่าคอนฟิก" />

      {params.ok ? (
        <div style={{ background: "#e7f4ec", border: "1px solid #bfe3cd", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#1b7a4b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="checkCircle" size={15} stroke={2.4} /> ส่งข้อความทดสอบเข้ากลุ่มแล้ว
        </div>
      ) : null}
      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      <SectionCard
        title="แจ้งเตือนเข้ากลุ่ม LINE"
        icon="bell"
        action={<AdBadge tone={groupId ? "success" : "warning"}>{groupId ? "เชื่อมแล้ว" : "ยังไม่เชื่อม"}</AdBadge>}
      >
        {groupId ? (
          <div style={{ display: "grid", gap: 10, marginTop: 2 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
              ระบบจะส่งแจ้งเตือน <b style={{ color: "var(--ink)" }}>ออเดอร์ใหม่</b> และ <b style={{ color: "var(--ink)" }}>สลิปใหม่</b> เข้ากลุ่มทีมงานนี้อัตโนมัติ
              <br />
              Group ID: <span style={{ fontFamily: "monospace" }}>{maskGroupId(groupId)}</span>
            </p>
            <form action={testLineNotifyAction}>
              <SubmitButton variant="secondary" pendingLabel="กำลังส่ง...">
                <Icon name="bell" size={15} stroke={2.4} /> ส่งข้อความทดสอบ
              </SubmitButton>
            </form>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 2, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>ยังไม่ได้เชื่อมกลุ่ม ทำตามขั้นตอนนี้:</p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>เปิด &quot;Allow bot to join group chats&quot; ใน LINE Developers Console (แท็บ Messaging API)</li>
              <li>ตั้ง Webhook URL เป็น <span style={{ fontFamily: "monospace", color: "var(--ink)" }}>/api/line/webhook</span> และเปิด Use webhook</li>
              <li>เพิ่ม OA เข้ากลุ่มทีมงาน แล้วพิมพ์ข้อความในกลุ่ม 1 ครั้ง</li>
              <li>กลับมาหน้านี้ ระบบจะขึ้น &quot;เชื่อมแล้ว&quot; ให้กดทดสอบได้</li>
            </ol>
          </div>
        )}
      </SectionCard>

      <div className="ad-card" style={{ padding: 4 }}>
        {settings.map((setting, i) => (
          <div
            key={setting.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "14px",
              borderBottom: i < settings.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{setting.key}</span>
            <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right", wordBreak: "break-word", maxWidth: "60%" }}>
              {renderValue(setting.value)}
            </span>
          </div>
        ))}
        {settings.length === 0 ? <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ยังไม่มีค่าตั้งค่า</div> : null}
      </div>
    </div>
  );
}
