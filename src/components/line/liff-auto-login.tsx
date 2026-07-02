"use client";

import { useEffect } from "react";

// Avoid retrying liff.login() in a redirect loop within the same tab session.
const ATTEMPT_KEY = "nak-liff-login-attempted";

/**
 * Inside the LINE in-app browser, the normal web OAuth flow loses cookies on iOS
 * (WKWebView) and fails. LIFF reads the LINE identity directly from the app, so we
 * exchange its id_token for a Supabase session server-side instead — no web redirect.
 *
 * Renders nothing. Only acts when opened inside LINE (`isInClient`); elsewhere the
 * regular email / web-OAuth login on the page still works.
 */
export function LiffAutoLogin() {
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;

    let cancelled = false;

    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (cancelled || !liff.isInClient()) return;

        if (!liff.isLoggedIn()) {
          if (sessionStorage.getItem(ATTEMPT_KEY)) return;
          sessionStorage.setItem(ATTEMPT_KEY, "1");
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) return;

        // Which side of the app the user is logging into decides the session
        // cookie scope (admins may use both sides with separate cookies).
        const scope = window.location.pathname.startsWith("/admin") ? "admin" : "customer";

        const res = await fetch("/api/auth/line-liff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken, scope }),
        });
        if (!res.ok) return;

        const data = (await res.json()) as { redirect?: string };
        sessionStorage.removeItem(ATTEMPT_KEY);
        if (data.redirect) window.location.replace(data.redirect);
      } catch {
        // Any failure → stay on the page so the user can log in manually.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
