import type { NextRequest } from "next/server";
import { recordVisit } from "@/server/game";
import { withVisitor } from "@/server/visitor";

export async function POST(request: NextRequest) {
  return withVisitor(request, (vid, ip) => recordVisit(vid, ip));
}
