import { connection, NextResponse } from "next/server";
import { momentCounts, worldVisits } from "@/server/game";

// Polled by open pages every few seconds for the live counter.
export async function GET() {
  await connection();
  try {
    const [visits, counts] = await Promise.all([worldVisits(), momentCounts()]);
    return NextResponse.json({ visits, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
