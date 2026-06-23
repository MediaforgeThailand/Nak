import { Icon } from "@/components/nak/icon";
import { PageHead } from "@/components/nak/ui";
import { getSettings } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

function renderValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="ตั้งค่าระบบ" sub="ค่าคอนฟิกสำคัญ (อ่านอย่างเดียว)" />

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

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          fontSize: 12.5,
          color: "var(--muted)",
          background: "var(--p-soft)",
          padding: "12px 14px",
          borderRadius: "var(--r-sm)",
          lineHeight: 1.5,
        }}
      >
        <Icon name="shield" size={17} stroke={2.2} style={{ color: "var(--p-deep)", flexShrink: 0, marginTop: 1 }} />
        หน้านี้เป็นมุมมองดูค่าระบบ โหมดแก้ไขเต็มรูปแบบจะเพิ่มในเฟสถัดไป
      </div>
    </div>
  );
}
