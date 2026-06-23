"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAdminAction } from "@/app/actions/auth";
import { Icon } from "@/components/nak/icon";
import { Avatar } from "@/components/nak/ui";

const NAV = [
  { href: "/admin/home", label: "แดชบอร์ด", icon: "dash", badge: "" },
  { href: "/admin/products", label: "สินค้า", icon: "package", badge: "" },
  { href: "/admin/stock", label: "สต็อก", icon: "warehouse", badge: "" },
  { href: "/admin/orders", label: "ออเดอร์", icon: "clipboard", badge: "orders" },
  { href: "/admin/payments", label: "สลิป", icon: "wallet", badge: "payments" },
  { href: "/admin/customers", label: "ลูกค้า", icon: "users", badge: "" },
  { href: "/admin/users", label: "สิทธิ์", icon: "shield", badge: "users" },
  { href: "/admin/settings", label: "ตั้งค่า", icon: "gear", badge: "" },
] as const;

export type AdminBadges = { orders: number; payments: number; users: number };

export function AdminShell({
  email,
  fullName,
  badges,
  children,
}: {
  email: string;
  fullName: string;
  badges: AdminBadges;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = NAV.find((n) => isActive(n.href)) ?? NAV[0];
  const badgeFor = (key: string) => (key ? badges[key as keyof AdminBadges] ?? 0 : 0);
  const alerts = badges.orders + badges.payments;

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <button className="adm-hb" onClick={() => setDrawer(true)} aria-label="เมนู" type="button">
          <Icon name="menu" size={21} stroke={2.2} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span className="adm-logo">N</span>
          <div style={{ lineHeight: 1.1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
              NAK <span style={{ color: "var(--p)" }}>Admin</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{current.label}</div>
          </div>
        </div>
        <Link href="/admin/orders" className="adm-hb" style={{ position: "relative" }} aria-label="แจ้งเตือน">
          <Icon name="bell" size={19} stroke={2.2} />
          {alerts > 0 ? <span className="adm-dot">{alerts}</span> : null}
        </Link>
      </header>

      <div className="adm-page">
        <div key={pathname} className="motion-page">
          {children}
        </div>
      </div>

      <div
        className={"adm-drawer" + (drawer ? " is-open" : "")}
        onClick={() => setDrawer(false)}
        aria-hidden={!drawer}
      >
        <aside className="adm-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="adm-drawer-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="adm-logo" style={{ width: 36, height: 36, fontSize: 18 }}>
                N
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  NAK <span style={{ color: "var(--p)" }}>Admin</span>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>ระบบหลังบ้าน</div>
              </div>
            </div>
            <button className="adm-hb" onClick={() => setDrawer(false)} aria-label="ปิด" type="button">
              <Icon name="x" size={19} stroke={2.4} />
            </button>
          </div>

          <nav className="adm-nav">
            {NAV.map((n) => {
              const count = badgeFor(n.badge);
              return (
                <Link key={n.href} href={n.href} className={"adm-navitem" + (isActive(n.href) ? " is-on" : "")}>
                  <Icon name={n.icon} size={20} stroke={isActive(n.href) ? 2.4 : 2} />
                  <span>{n.label}</span>
                  {count > 0 ? <span className="adm-navbadge">{count}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="adm-drawer-foot">
            <Link className="adm-navitem" href="/home" style={{ color: "var(--p-deep)" }}>
              <Icon name="bag" size={20} stroke={2.2} />
              <span>ดูฝั่งลูกค้า</span>
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 10px 4px",
                borderTop: "1px solid var(--line)",
                marginTop: 6,
              }}
            >
              <Avatar name={fullName || email} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fullName || "ทีมงาน"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
              </div>
              <form action={signOutAdminAction}>
                <button className="adm-hb" type="submit" aria-label="ออกจากระบบ">
                  <Icon name="power" size={16} stroke={2.2} />
                </button>
              </form>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
