"use client";

import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { money } from "@/lib/format";
import { levelForQty, nextTier, sortedTiers, tierDiscountForQty, tierRelativeDiscount } from "@/lib/pricing";
import type { PriceTier } from "@/lib/types";

function LevelChip({ level, active }: { level: number; active?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        color: active ? "#fff" : "var(--muted)",
        background: active ? "var(--p)" : "var(--chip)",
        borderRadius: 999,
        padding: "3px 8px",
        flexShrink: 0,
        letterSpacing: ".02em",
      }}
    >
      Lv.{level}
    </span>
  );
}

export function PriceProgramView({
  floorQuantity,
  monthQuantity,
  lockedFloorQuantity = 0,
  tiers: rawTiers,
}: {
  floorQuantity: number;
  monthQuantity: number;
  lockedFloorQuantity?: number;
  tiers: PriceTier[];
}) {
  const tiers = sortedTiers(rawTiers);
  // The lock only "binds" (drives the shown level) when it meets or exceeds the
  // rolling floor. floorQuantity = greatest(rolling 2-month, locked), so the lock
  // is the binding constraint exactly when lockedFloorQuantity >= floorQuantity.
  const lockBinds = lockedFloorQuantity > 0 && lockedFloorQuantity >= floorQuantity;

  // Active rank this month (from last month's volume).
  const activeLevel = levelForQty(tiers, Math.max(floorQuantity, 1));
  const activeDiscount = tierDiscountForQty(tiers, Math.max(floorQuantity, 1));

  // Progress this month toward next month's rank.
  const reachedLevel = levelForQty(tiers, monthQuantity);
  const upcoming = nextTier(tiers, monthQuantity);
  const progressPct = upcoming
    ? Math.min(Math.round((monthQuantity / upcoming.min_quantity) * 100), 100)
    : 100;
  const qtyToNext = upcoming ? upcoming.min_quantity - monthQuantity : 0;

  return (
    <div style={{ display: "grid", gap: 13, padding: "14px 14px 24px" }}>
      {/* hero: current rank + discount (applies to every product) */}
      <div className="nak-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--p-deep), var(--p))",
            color: "#fff",
            padding: "16px 16px 17px",
            display: "grid",
            gap: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="trending" size={14} stroke={2.2} /> Level ของฉันเดือนนี้
              </span>
              {lockBinds ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.35)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 10.5,
                    fontWeight: 800,
                  }}
                >
                  <Icon name="shield" size={11} stroke={2.6} /> ล็อกโดยร้าน
                </span>
              ) : null}
            </div>
            <span
              className="pp-badge"
              style={{
                background: "rgba(255,255,255,.16)",
                border: "1px solid rgba(255,255,255,.3)",
                borderRadius: 999,
                padding: "5px 13px",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: ".02em",
              }}
            >
              Lv.{activeLevel}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>
              {activeDiscount > 0 ? (
                <>
                  ลด {money(activeDiscount)} <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>/ ชิ้น ทุกสินค้า</span>
                </>
              ) : (
                <>
                  ราคาปกติ <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>— สะสมยอดเพื่อรับส่วนลด</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 3, lineHeight: 1.5 }}>
              {lockBinds
                ? "ร้านล็อกส่วนลดระดับนี้ให้คุณ — สั่งกี่ชิ้นก็ได้ส่วนลดนี้ทุกสินค้า ไม่หลุดแม้ยอดไม่ถึง"
                : floorQuantity > 0
                  ? `ยอดสะสม 2 เดือนล่าสุดถึง ${floorQuantity.toLocaleString("th-TH")} ชิ้น — สั่งกี่ชิ้นก็ได้ส่วนลดนี้ทุกสินค้า`
                  : "สั่งครั้งเดียวเยอะ หรือทยอยสะสมทั้งเดือน ก็ได้ส่วนลดขั้นสูงขึ้น"}
            </div>
          </div>
        </div>

        {/* progress this month */}
        <div style={{ padding: "13px 16px 15px", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>ยอดสะสมเดือนนี้ (ทุกสินค้า)</span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {monthQuantity.toLocaleString("th-TH")} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>ชิ้น</span>
            </span>
          </div>
          <div className="pp-track">
            <div className="pp-fill" style={{ ["--pp-target" as string]: `${progressPct}%` }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
            {upcoming ? (
              <>
                อีก <b style={{ color: "var(--ink)" }}>{qtyToNext.toLocaleString("th-TH")} ชิ้น</b> ถึง{" "}
                <b style={{ color: "var(--p)" }}>Lv.{reachedLevel + 1}</b>{" "}
                {tierRelativeDiscount(tiers, upcoming) > 0
                  ? `(ลด ${money(tierRelativeDiscount(tiers, upcoming))}/ชิ้น)`
                  : ""}{" "}
                — ได้ส่วนลดนี้ต่อเนื่อง 2 เดือนถัดไป
              </>
            ) : (
              <>สุดยอด! คุณสะสมถึงขั้นสูงสุดแล้ว 🎉</>
            )}
            {reachedLevel > 0 ? (
              <div style={{ marginTop: 3, color: "#1b7a4b", fontWeight: 600 }}>
                <Icon name="checkCircle" size={12} stroke={2.4} style={{ verticalAlign: -2 }} /> ตอนนี้ทำได้ Lv.{reachedLevel} แล้ว
                ใช้ต่อได้อีก 2 เดือน
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* the global ladder */}
      <div className="nak-card" style={{ padding: 15, display: "grid", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="trending" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>ตารางส่วนลดตามจำนวน</h3>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>ใช้กับสินค้าทุกชิ้นในร้าน — นับรวมทุกสินค้า</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {tiers.map((tier, i) => {
            const level = i + 1;
            const isActive = level === activeLevel;
            const reached = level <= reachedLevel;
            const rel = tierRelativeDiscount(tiers, tier);
            return (
              <div
                key={tier.min_quantity}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: isActive ? "var(--p-soft)" : "transparent",
                  border: isActive ? "1px solid var(--p)" : "1px solid transparent",
                }}
              >
                <LevelChip level={level} active={isActive} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isActive ? "var(--p-deep)" : "var(--ink)" }}>
                  {tier.min_quantity.toLocaleString("th-TH")}+ ชิ้น
                </span>
                {reached ? <Icon name="checkCircle" size={14} stroke={2.4} style={{ color: "#1b7a4b" }} /> : null}
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: rel > 0 ? "#1b7a4b" : isActive ? "var(--p-deep)" : "var(--muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rel > 0 ? `-${money(rel)}/ชิ้น` : "ราคาปกติ"}
                </span>
              </div>
            );
          })}
        </div>
        {activeLevel > 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            แถบสีแดง = ส่วนลดที่คุณได้เดือนนี้ · <Icon name="checkCircle" size={11} stroke={2.4} style={{ color: "#1b7a4b", verticalAlign: -1.5 }} /> = ยอดสะสมเดือนนี้ถึงแล้ว
          </div>
        ) : null}
      </div>

      {/* rules */}
      <div className="nak-card" style={{ padding: 15, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="shield" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>กติกาง่าย ๆ</h3>
        </div>
        {[
          { icon: "cart", text: "สั่งครั้งเดียวเยอะ ได้ส่วนลดขั้นนั้นทันที — นับจำนวนรวมทุกสินค้าในออเดอร์" },
          {
            icon: "trending",
            text: "ทยอยซื้อก็ได้! ยอดที่อนุมัติแล้วสะสมรวมทั้งเดือน — ซื้อถึงขั้นในเดือนไหน ได้ส่วนลดขั้นนั้นทุกออเดอร์ต่อเนื่อง 2 เดือน แม้สั่งครั้งละน้อย",
          },
          { icon: "clock", text: "Level อิงยอดสะสมสูงสุดใน 2 เดือนล่าสุด — ซื้อถึงเดือนเดียวก็ได้ส่วนลดยาวไป 2 เดือน" },
        ].map((rule) => (
          <div key={rule.icon} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: "var(--p-soft)",
                color: "var(--p-deep)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={rule.icon} size={15} stroke={2.2} />
            </span>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--muted)" }}>{rule.text}</p>
          </div>
        ))}
      </div>

      <Link
        href="/home"
        className="nak-card nak-press"
        style={{
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--p)",
        }}
      >
        <Icon name="bag" size={17} stroke={2.2} /> เริ่มสั่งซื้อสะสมยอดเลย
      </Link>
    </div>
  );
}
