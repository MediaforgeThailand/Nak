"use client";

import { useEffect } from "react";

// Avoid retrying liff.login() in a redirect loop within the same tab session.
const ATTEMPT_KEY = "nak-liff-login-attempted";

// THROWAWAY diagnostic beacon — reports LIFF state so we can see what real
// devices (esp. iPad) actually do. Remove once the iPad issue is resolved.
function beacon(data: Record<string, unknown>) {
  try {
    fetch("/api/_liff-debug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, ua: navigator.userAgent }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

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
    if (!liffId) {
      beacon({ stage: "no-liff-id" });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        beacon({ stage: "loaded" });
        await liff.init({ liffId });
        if (cancelled) return;

        const state = {
          stage: "inited",
          isInClient: liff.isInClient(),
          isLoggedIn: liff.isLoggedIn(),
          os: liff.getOS?.(),
          lineVersion: liff.getLineVersion?.(),
        };
        beacon(state);

        if (!liff.isInClient()) {
          beacon({ stage: "not-in-client-stop" });
          return;
        }

        if (!liff.isLoggedIn()) {
          if (sessionStorage.getItem(ATTEMPT_KEY)) {
            beacon({ stage: "already-attempted-stop" });
            return;
          }
          sessionStorage.setItem(ATTEMPT_KEY, "1");
          beacon({ stage: "calling-login" });
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        beacon({ stage: "got-token", hasIdToken: !!idToken });
        if (!idToken) return;

        const res = await fetch("/api/auth/line-liff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        beacon({ stage: "exchange-done", status: res.status });
        if (!res.ok) return;

        const data = (await res.json()) as { redirect?: string };
        sessionStorage.removeItem(ATTEMPT_KEY);
        if (data.redirect) window.location.replace(data.redirect);
      } catch (err) {
        beacon({ stage: "error", error: String(err) });
        // Any failure → stay on the page so the user can log in manually.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
