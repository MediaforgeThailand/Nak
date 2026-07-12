"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 10, maxWidth: 320 }}>
        <div style={{ fontSize: 40 }}>😵</div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>เกิดข้อผิดพลาดชั่วคราว</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
          ระบบขัดข้องชั่วขณะ กรุณาลองใหม่อีกครั้ง
          <br />
          หากยังไม่หายให้ติดต่อร้าน
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            marginTop: 4,
            justifySelf: "center",
            padding: "10px 22px",
            borderRadius: 12,
            border: "none",
            background: "var(--p, #0c2a26)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ลองอีกครั้ง
        </button>
      </div>
    </div>
  );
}
