import { NextResponse } from "next/server";

// THROWAWAY diagnostic endpoint to capture LIFF client state from real devices.
// Remove together with the beacon in liff-auto-login.tsx and the
// [oauth-callback] logs once the LINE login issue is resolved.
//
// Do NOT rename this folder to "_liff-debug": Next.js treats an underscore
// prefix as a private folder and opts it out of routing, so every beacon POST
// would 404 silently — which is exactly why the first attempt captured nothing.
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  console.log("[liff-debug]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
