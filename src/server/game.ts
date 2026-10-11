import { CLIENT_RECORDED, MOMENT_IDS, type Tier } from "@/game/moments";
import type { Arrival, Snapshot } from "@/game/backend";
import { getStore } from "./store";

// Tuning. Without Redis (local dev) the defaults are boosted so things happen quickly.
function config() {
  const testing = getStore().kind === "memory";
  const n = (name: string, fallback: number) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    milestone: n("MILESTONE", testing ? 20 : 50000),
    oddsBoost: Math.min(1000, n("ODDS_BOOST", testing ? 100 : 1)),
    visitCooldown: n("VISIT_COOLDOWN_SECONDS", testing ? 20 : 30 * 60),
    rollCooldown: n("ROLL_COOLDOWN_SECONDS", 25),
    // New visits counted per IP per hour. High enough for offices and phone networks behind one IP.
    ipVisitsPerHour: n("IP_VISITS_PER_HOUR", 60),
  };
}

const K = {
  world: "world:visits",
  counts: "moment_counts",
  visitor: (vid: string) => `visitor:${vid}`,
  seen: (vid: string) => `seen:${vid}`,
  visitLock: (vid: string) => `lock:visit:${vid}`,
  rollLock: (vid: string) => `lock:roll:${vid}`,
  ip: (ip: string) => `ip:${ip}:${Math.floor(Date.now() / 3_600_000)}`,
};

async function see(vid: string, id: string) {
  const store = getStore();
  if (await store.sadd(K.seen(vid), id)) await store.hincr(K.counts, id, 1);
}

export async function snapshot(vid: string): Promise<Snapshot> {
  const store = getStore();
  const [worldVisits, myVisits, seen, counts] = await Promise.all([
    store.getNumber(K.world),
    store.hgetNumber(K.visitor(vid), "visits"),
    store.smembers(K.seen(vid)),
    store.hgetallNumbers(K.counts),
  ]);
  return { mode: store.kind === "redis" ? "live" : "local", milestone: config().milestone, worldVisits, myVisits, seen, counts };
}

/**
 * One visit per visitor per cooldown window. INCR is atomic, so exactly one
 * visitor gets each number and whoever lands a milestone gets the legendary.
 */
export async function recordVisit(vid: string, ip: string): Promise<Arrival> {
  const store = getStore(), cfg = config();
  const notCounted = async (): Promise<Arrival> => ({
    counted: false,
    worldVisits: await store.getNumber(K.world),
    myVisits: await store.hgetNumber(K.visitor(vid), "visits"),
    legendary: null,
    visitNumber: null,
  });

  if (!(await store.claim(K.visitLock(vid), cfg.visitCooldown))) return notCounted();
  if ((await store.incrExpiring(K.ip(ip), 3600)) > cfg.ipVisitsPerHour) return notCounted();

  const n = await store.incr(K.world);
  const mine = await store.hincr(K.visitor(vid), "visits", 1);
  let legendary: string | null = null;
  if (n % cfg.milestone === 0) {
    const legends = MOMENT_IDS.legend;
    legendary = legends[(n / cfg.milestone - 1) % legends.length];
    await see(vid, legendary);
  }
  return { counted: true, worldVisits: n, myVisits: mine, legendary, visitNumber: legendary ? n : null };
}

/** The client asks on arrival and every 30 seconds; the server decides. */
export async function roll(vid: string): Promise<string | null> {
  const store = getStore(), cfg = config();
  if ((await store.hgetNumber(K.visitor(vid), "visits")) === 0) return null;
  if (!(await store.claim(K.rollLock(vid), cfg.rollCooldown))) return null;

  const r = Math.random(), pBig = cfg.oddsBoost / 5000, pSmall = cfg.oddsBoost / 500;
  const tier: Tier | null = r < pBig ? "big" : r < pBig + pSmall ? "small" : null;
  if (!tier) return null;
  const ids = MOMENT_IDS[tier];
  const id = ids[Math.floor(Math.random() * ids.length)];
  await see(vid, id);
  return id;
}

/** Only links he sends and secrets you find. Rare moments are refused. */
export async function recordSighting(vid: string, id: string): Promise<boolean> {
  const allowed = CLIENT_RECORDED.some((tier) => MOMENT_IDS[tier].includes(id));
  if (!allowed) return false;
  await see(vid, id);
  return true;
}

export const worldVisits = () => getStore().getNumber(K.world);
export const momentCounts = () => getStore().hgetallNumbers(K.counts);
