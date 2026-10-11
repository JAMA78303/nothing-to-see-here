import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "ntsh_vid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Runs a handler with this browser's visitor id, minting one (in an
 * httpOnly cookie) on the first request. No accounts, no personal data.
 */
export async function withVisitor(
  request: NextRequest,
  handler: (vid: string, ip: string) => Promise<unknown>,
): Promise<NextResponse> {
  const existing = request.cookies.get(COOKIE)?.value;
  const vid = existing && UUID.test(existing) ? existing : crypto.randomUUID();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    const res = NextResponse.json(await handler(vid, ip), { headers: { "Cache-Control": "no-store" } });
    if (vid !== existing) {
      res.cookies.set(COOKIE, vid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 730,
      });
    }
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
