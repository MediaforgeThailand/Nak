import { NextResponse } from "next/server";
import { sendScheduledReports } from "@/lib/line-report";

export const dynamic = "force-dynamic";

// Daily scheduled LINE reports (see vercel.json cron — 13:00 UTC = 20:00 Bangkok).
// Sends one flex message per run: daily report, plus weekly (Sundays) and
// monthly (the 1st) bundled into the same message. Guarded by CRON_SECRET.
// ?force=daily|weekly|monthly (comma-separated) resends for manual testing.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const force = (url.searchParams.get("force") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is "daily" | "weekly" | "monthly" => s === "daily" || s === "weekly" || s === "monthly");

  const result = await sendScheduledReports(force.length > 0 ? { force } : {});
  return NextResponse.json(result);
}
