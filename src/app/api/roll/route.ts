import type { NextRequest } from "next/server";
import { roll } from "@/server/game";
import { withVisitor } from "@/server/visitor";

export async function POST(request: NextRequest) {
  return withVisitor(request, async (vid) => ({ moment: await roll(vid) }));
}
