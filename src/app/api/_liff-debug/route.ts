import { NextResponse } from "next/server";

// THROWAWAY diagnostic endpoint to capture LIFF client state from real devices.
// Remove once the iPad login issue is resolved.
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
