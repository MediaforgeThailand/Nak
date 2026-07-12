import { NextResponse } from "next/server";
import { getGroupLinkState, lineServiceClient, setLinkedGroupId, verifyLineSignature } from "@/lib/line";

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
    const { id: current, blocked } = await getGroupLinkState(client);
    for (const event of events) {
      const src = event.source;
      const groupId = src?.groupId ?? src?.roomId ?? null;
      if (!groupId) continue;

      // Link ONLY while no group is linked yet. Once linked, activity in other
      // groups must never steal the link — the nightly report contains revenue
      // and debtor names, so following any group the OA lands in would leak it.
      // After an explicit admin unlink, the old group is "blocked": its chatter
      // can't re-link it (the OA usually stays a member), only a fresh join
      // (deliberate re-invite) or a different group can take the link.
      if (!current) {
        const blockedChatter = event.type === "message" && groupId === blocked;
        if ((event.type === "join" || event.type === "message") && !blockedChatter) {
          await setLinkedGroupId(client, groupId);
          break;
        }
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
