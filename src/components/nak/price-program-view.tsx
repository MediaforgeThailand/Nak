"use client";

import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { ProductImage } from "@/components/nak/ui";
import { money } from "@/lib/format";
import { levelForQty, nextTier, sortedTiers, tierForQty } from "@/lib/pricing";
import type { PriceTier } from "@/lib/types";

type LadderProduct = {
  id: string;
  name: string;
  unit: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  tiers: PriceTier[];
};

function thaiNextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(next);
}

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
  discountPerItem,
  products,
}: {
  floorQuantity: number;
  monthQuantity: number;
  discountPerItem: number;
  products: LadderProduct[];
}) {
  const flagship = products[0] ?? null;
  const flagTiers = flagship ? sortedTiers(flagship.tiers) : [];

  // Active rank this month (from last month's volume) on the flagship ladder.
  const activeLevel = flagship ? levelForQty(flagTiers, Math.max(floorQuantity, 1)) : 0;
  const activeTier = flagship ? tierForQty(flagTiers, Math.max(floorQuantity, 1)) : null;

  // Progress this month toward next month's rank.
  const reachedLevel = flagship ? levelForQty(flagTiers, monthQuantity) : 0;
  const upcoming = flagship ? nextTier(flagTiers, monthQuantity) : null;
  const progressPct = !flagship
    ? 0
    : upcoming
      ? Math.min(Math.round((monthQuantity / upcoming.min_quantity) * 100), 100)
      : 100;
  const qtyToNext = upcoming ? upcoming.min_quantity - monthQuantity : 0;
  const nextMonthName = thaiNextMonth();

  const finalTierPrice = (tier: PriceTier) =>
    money(Math.max(Number(tier.unit_price) - Math.max(discountPerItem, 0), 0));

  return (
    <div style={{ display: "grid", gap: 13, padding: "14px 14px 24px" }}>
      {/* hero: current rank */}
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
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="trending" size={14} stroke={2.2} /> Level ของฉันเดือนนี้
            </div>
            {flagship ? (
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
            ) : null}
          </div>
          {flagship && activeTier ? (
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>
                {finalTierPrice(activeTier)} <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>/ {flagship.unit}</span>
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 3, lineHeight: 1.5 }}>
                {floorQuantity > 0
                  ? `เดือนที่แล้วซื้อสะสม ${floorQuantity.toLocaleString("th-TH")} ชิ้น — เดือนนี้สั่งกี่ชิ้นก็ได้ราคานี้`
                  : "ราคาเริ่มต้น — สั่งเยอะขึ้นหรือสะสมยอดเพื่อได้ราคาถูกลง"}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.9 }}>ยังไม่มีสินค้าในโปรแกรมราคา</div>
          )}
        </div>

        {/* progress this month */}
        {flagship ? (
          <div style={{ padding: "13px 16px 15px", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>ยอดสะสมเดือนนี้</span>
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
                  <b style={{ color: "var(--p)" }}>Lv.{reachedLevel + 1}</b> ({finalTierPrice(upcoming)}/{flagship.unit}) —
                  ใช้เป็นราคาประจำเดือน{nextMonthName}
                </>
              ) : (
                <>สุดยอด! คุณสะสมถึงขั้นสูงสุดแล้ว 🎉</>
              )}
              {reachedLevel > 0 ? (
                <div style={{ marginTop: 3, color: "#1b7a4b", fontWeight: 600 }}>
                  <Icon name="checkCircle" size={12} stroke={2.4} style={{ verticalAlign: -2 }} /> ตอนนี้ทำได้ Lv.{reachedLevel} แล้ว
                  สำหรับเดือน{nextMonthName}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* ladder per product */}
      {products.map((product) => {
        const tiers = sortedTiers(product.tiers);
        const productActiveLevel = levelForQty(tiers, Math.max(floorQuantity, 1));
        const productReachedLevel = levelForQty(tiers, monthQuantity);
        return (
          <div key={product.id} className="nak-card" style={{ padding: 15, display: "grid", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, flexShrink: 0 }}>
                <ProductImage seed={product.sku || product.id} imageUrl={product.imageUrl} alt={product.name} ratio="1 / 1" iconSize={18} radius="10px" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>ตารางราคาตามจำนวน / ยอดสะสม</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              {tiers.map((tier, i) => {
                const level = i + 1;
                const isActive = level === productActiveLevel;
                const reached = level <= productReachedLevel;
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
                      {tier.min_quantity.toLocaleString("th-TH")}+ {product.unit}
                    </span>
                    {reached ? (
                      <Icon name="checkCircle" size={14} stroke={2.4} style={{ color: "#1b7a4b" }} />
                    ) : null}
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: isActive ? "var(--p-deep)" : "var(--ink)", whiteSpace: "nowrap" }}>
                      {finalTierPrice(tier)}
                    </span>
                  </div>
                );
              })}
            </div>
            {productActiveLevel > 0 ? (
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                แถบสีแดง = ราคาที่คุณได้เดือนนี้ · <Icon name="checkCircle" size={11} stroke={2.4} style={{ color: "#1b7a4b", verticalAlign: -1.5 }} /> = ยอดสะสมเดือนนี้ถึงแล้ว
              </div>
            ) : null}
          </div>
        );
      })}

      {/* rules */}
      <div className="nak-card" style={{ padding: 15, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="shield" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>กติกาง่าย ๆ</h3>
        </div>
        {[
          { icon: "cart", text: "สั่งครั้งเดียวเยอะ ได้ราคาขั้นนั้นทันที เช่น สั่ง 20 ชิ้น = ราคาขั้น 20 ชิ้น" },
          {
            icon: "trending",
            text: "ทยอยซื้อก็ได้! ยอดที่อนุมัติแล้วสะสมรวมทั้งเดือน — เดือนถัดไปได้ราคาขั้นนั้นทุกออเดอร์ แม้สั่งครั้งละน้อย",
          },
          { icon: "clock", text: "ตัดรอบทุกสิ้นเดือน — Level เดือนหน้าอิงยอดสะสมเดือนนี้เท่านั้น รักษายอดเพื่อคงระดับ" },
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
