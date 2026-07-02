"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/nak/icon";

const CART_KEY = "nak_cart";

const TABS = [
  { id: "shop", href: "/home", label: "สินค้า", icon: "bag" },
  { id: "orders", href: "/orders", label: "ออเดอร์", icon: "receipt" },
  { id: "level", href: "/price-program", label: "เลเวล", icon: "trending" },
  { id: "profile", href: "/profile", label: "โปรไฟล์", icon: "user" },
] as const;

const MAIN_TAB: Record<string, (typeof TABS)[number]["id"]> = {
  "/home": "shop",
  "/orders": "orders",
  "/price-program": "level",
  "/profile": "profile",
};

function subscribeCart(callback: () => void) {
  window.addEventListener("nak-cart-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("nak-cart-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function cartSnapshot() {
  if (typeof window === "undefined") return "{}";
  return window.localStorage.getItem(CART_KEY) ?? "{}";
}

function useCartCount() {
  const snapshot = useSyncExternalStore(subscribeCart, cartSnapshot, () => "{}");
  try {
    const cart = JSON.parse(snapshot) as Record<string, number>;
    return Object.values(cart).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  } catch {
    return 0;
  }
}

function CartButton({ count }: { count: number }) {
  return (
    <Link href="/cart" className="nak-iconbtn" aria-label="ตะกร้า" style={{ position: "relative" }}>
      <Icon name="cart" size={20} stroke={2.2} />
      {count > 0 ? <span className="nak-cartbadge">{count}</span> : null}
    </Link>
  );
}

function AppBar({ tab, count }: { tab: (typeof TABS)[number]["id"]; count: number }) {
  if (tab === "shop") {
    return (
      <div className="nak-appbar">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--p)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: ".02em",
            }}
          >
            N
          </span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>
              NAK <span style={{ color: "var(--p)" }}>Wholesale</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 500 }}>ขายส่งครบ จบในที่เดียว</div>
          </div>
        </div>
        <CartButton count={count} />
      </div>
    );
  }
  const titles: Record<string, string> = { orders: "ออเดอร์ของฉัน", level: "สิทธิ์ราคาสมาชิก", profile: "โปรไฟล์" };
  return (
    <div className="nak-appbar">
      <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>{titles[tab]}</h1>
      {tab === "orders" ? <CartButton count={count} /> : null}
    </div>
  );
}

function TabBar({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav className="nak-tabbar">
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <Link key={t.id} href={t.href} className={"nak-tab" + (on ? " is-on" : "")}>
            <Icon name={t.icon} size={22} stroke={on ? 2.4 : 2} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    function onToast(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      setMessage(typeof detail === "string" ? detail : "บันทึกแล้ว");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(null), 2200);
    }
    window.addEventListener("nak-toast", onToast);
    return () => {
      window.removeEventListener("nak-toast", onToast);
      window.clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="nak-toast">
      <span style={{ color: "#fff", display: "grid", placeItems: "center" }}>
        <Icon name="checkCircle" size={18} stroke={2.4} />
      </span>
      {message}
    </div>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const count = useCartCount();
  const tab = MAIN_TAB[pathname];
  const isMain = Boolean(tab);

  return (
    <div className="nak-shell">
      {isMain ? <AppBar tab={tab} count={count} /> : null}
      <div key={pathname} className="nak-shell-body motion-page">
        {children}
      </div>
      {isMain ? <TabBar active={tab} /> : null}
      <Toast />
    </div>
  );
}
