import { NextResponse } from "next/server";
import { deliverLineOutbox } from "@/lib/line-notify";

export const dynamic = "force-dynamic";

// Backstop that retries any queued/failed LINE notifications. Called by the
// Vercel cron (see vercel.json). Optionally protected with CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await deliverLineOutbox();
  return NextResponse.json(result);
}
