import { NextResponse } from "next/server";
import { getLinkedGroupId, lineServiceClient, setLinkedGroupId, verifyLineSignature } from "@/lib/line";

export const dynamic = "force-dynamic";

type LineSource = { type?: string; groupId?: string; roomId?: string; userId?: string };
type LineEvent = { type?: string; source?: LineSource };

// LINE Messaging API webhook. Its main job here is to auto-capture the staff
// GROUP id the first time the OA is added to a group (or anyone messages in it),
// so notifications can be pushed to that group. Also clears it on leave/unfollow.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(rawBody)?.events as LineEvent[]) ?? [];
  } catch {
    events = [];
  }

  const client = lineServiceClient();
  if (client && events.length > 0) {
    const current = await getLinkedGroupId(client);
    for (const event of events) {
      const src = event.source;
      const groupId = src?.groupId ?? src?.roomId ?? null;
      if (!groupId) continue;

      // Bot added to a group, or activity in it → link this group.
      if (event.type === "join" || event.type === "message") {
        if (groupId !== current) await setLinkedGroupId(client, groupId);
        break;
      }
      // Bot removed from the linked group → unlink.
      if (event.type === "leave" && groupId === current) {
        await setLinkedGroupId(client, null);
        break;
      }
    }
  }

  // LINE expects a 200 for every delivery (including the console "Verify" ping).
  return NextResponse.json({ ok: true });
}
