import type { NextRequest } from "next/server";
import { momentCounts, recordSighting } from "@/server/game";
import { withVisitor } from "@/server/visitor";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  return withVisitor(request, async (vid) => {
    const ok = typeof body.id === "string" && (await recordSighting(vid, body.id));
    return { ok, counts: await momentCounts() };
  });
}
