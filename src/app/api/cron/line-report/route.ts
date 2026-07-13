import { NextResponse } from "next/server";
import { sendScheduledReports } from "@/lib/line-report";

export const dynamic = "force-dynamic";

// Daily scheduled LINE reports (see vercel.json cron — 13:00 UTC = 20:00 Bangkok).
// Sends one flex message per run: daily report, plus weekly (Sundays) and
// monthly (the 1st) bundled into the same message. Guarded by CRON_SECRET.
// ?force=daily|weekly|monthly (comma-separated) resends for manual testing;
// add &preview=1 to send only the forced kinds without touching any state,
// so the scheduled sends still go out as usual.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Fail closed whenever a real LINE token is present (not just in production):
  // otherwise a preview/dev deploy sharing the prod LINE credentials would leave
  // this endpoint publicly callable, and ?force= could push to the real staff
  // group and burn the monthly LINE quota.
  if (!secret && (process.env.VERCEL_ENV === "production" || process.env.LINE_OA_ACCESS_TOKEN)) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
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

  const preview = url.searchParams.get("preview") === "1";
  const result = await sendScheduledReports(force.length > 0 ? { force, preview } : {});
  return NextResponse.json(result);
}
