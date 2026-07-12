import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 10, maxWidth: 320 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>ไม่พบหน้าที่ต้องการ</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
          ลิงก์อาจไม่ถูกต้อง หรือรายการนี้ถูกลบไปแล้ว
        </p>
        <Link
          href="/home"
          style={{
            marginTop: 4,
            justifySelf: "center",
            padding: "10px 22px",
            borderRadius: 12,
            background: "var(--p, #0c2a26)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
