import type { NextRequest } from "next/server";
import { snapshot } from "@/server/game";
import { withVisitor } from "@/server/visitor";

export async function GET(request: NextRequest) {
  return withVisitor(request, (vid) => snapshot(vid));
}
