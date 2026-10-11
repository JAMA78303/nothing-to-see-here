import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Arrival = {
  counted: boolean;
  worldVisits: number;
  myVisits: number;
  legendary: string | null;
  visitNumber: number | null;
};

export type Snapshot = {
  milestone: number;
  worldVisits: number;
  myVisits: number;
  seen: string[];
  counts: Record<string, number>;
};

export interface Backend {
  /** "live" when visits are counted on the server, "local" for the offline dev fallback. */
  readonly mode: "live" | "local";
  start(): Promise<Snapshot>;
  /** Records this page load as a visit (at most once per page load). */
  arrive(): Promise<Arrival>;
  /** Asks for a rare-moment roll. Returns the moment id, or null for nothing. */
  roll(): Promise<string | null>;
  /** Only for links and secrets; rare moments are recorded by the server. */
  recordSighting(id: string): Promise<void>;
  counts(): Promise<Record<string, number>>;
  onWorld(cb: (visits: number) => void): () => void;
}

/* ---------------------------------------------------------------- Supabase */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
const sb = () => (client ??= createClient(url!, key!));

async function ensureSession() {
  const { data } = await sb().auth.getSession();
  if (data.session) return;
  const { error } = await sb().auth.signInAnonymously();
  if (error) throw error;
}

const toCounts = (rows: { moment_id: string; witnesses: number }[] | null) =>
  Object.fromEntries((rows ?? []).map((r) => [r.moment_id, r.witnesses]));

// Memoised per page load so React's double-invoked effects can't count a visit twice.
let started: Promise<Snapshot> | null = null;
let arrived: Promise<Arrival> | null = null;

const supabaseBackend: Backend = {
  mode: "live",
  start() {
    return (started ??= (async () => {
      await ensureSession();
      const [settings, world, me, sightings, counts] = await Promise.all([
        sb().from("settings").select("milestone").single(),
        sb().from("world").select("visits").single(),
        sb().from("visitors").select("visits").maybeSingle(),
        sb().from("sightings").select("moment_id"),
        sb().from("moment_counts").select("moment_id, witnesses"),
      ]);
      const err = settings.error ?? world.error ?? sightings.error ?? counts.error;
      if (err) throw err;
      return {
        milestone: settings.data!.milestone,
        worldVisits: Number(world.data!.visits),
        myVisits: me.data?.visits ?? 0,
        seen: (sightings.data ?? []).map((s) => s.moment_id),
        counts: toCounts(counts.data),
      };
    })());
  },
  arrive() {
    return (arrived ??= (async () => {
      await this.start();
      const { data, error } = await sb().rpc("record_visit");
      if (error) throw error;
      return {
        counted: data.counted,
        worldVisits: Number(data.world_visits),
        myVisits: data.my_visits,
        legendary: data.legendary,
        visitNumber: data.visit_number === null ? null : Number(data.visit_number),
      };
    })());
  },
  async roll() {
    const { data, error } = await sb().rpc("roll_moment");
    if (error) throw error;
    return data.moment ?? null;
  },
  async recordSighting(id) {
    const { error } = await sb().rpc("record_sighting", { p_moment: id });
    if (error) throw error;
  },
  async counts() {
    const { data, error } = await sb().from("moment_counts").select("moment_id, witnesses");
    if (error) throw error;
    return toCounts(data);
  },
  onWorld(cb) {
    const channel = sb()
      .channel("world")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "world" }, (payload) =>
        cb(Number((payload.new as { visits: number }).visits)),
      )
      .subscribe();
    return () => void sb().removeChannel(channel);
  },
};

/* ------------------------------------------------- Local (no Supabase env) */
// Lets you run `npm run dev` without a database: boosted odds, a 20 second
// visit window and a milestone of 20, all kept in this browser.

const LS = "ntsh:local";
const LOCAL = { boost: 100, milestone: 20, visitWindowMs: 20000 };
const LOCAL_TIERS: Record<string, string[]> = {
  small: ["grape", "pigeon", "sneeze", "shadow", "hello", "twin", "knock", "leave", "timer", "pressure"],
  big: ["ferrets", "backflip", "tux", "violin", "cake"],
  legend: ["nesting", "disco", "ufo", "confess"],
};
type LocalState = { visits: number; lastVisitAt: number; seen: string[] };
const load = (): LocalState => {
  try {
    return { visits: 0, lastVisitAt: 0, seen: [], ...JSON.parse(localStorage.getItem(LS) ?? "{}") };
  } catch {
    return { visits: 0, lastVisitAt: 0, seen: [] };
  }
};
const save = (s: LocalState) => {
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {}
};
const see = (id: string) => {
  const s = load();
  if (!s.seen.includes(id)) save({ ...s, seen: [...s.seen, id] });
};
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
let localArrived: Promise<Arrival> | null = null;

const localBackend: Backend = {
  mode: "local",
  async start() {
    const s = load();
    return {
      milestone: LOCAL.milestone,
      worldVisits: s.visits,
      myVisits: s.visits,
      seen: s.seen,
      counts: Object.fromEntries(s.seen.map((id) => [id, 1])),
    };
  },
  arrive() {
    return (localArrived ??= (async () => {
      const s = load();
      if (Date.now() - s.lastVisitAt < LOCAL.visitWindowMs) {
        return { counted: false, worldVisits: s.visits, myVisits: s.visits, legendary: null, visitNumber: null };
      }
      const n = s.visits + 1;
      save({ ...s, visits: n, lastVisitAt: Date.now() });
      let legendary: string | null = null;
      if (n % LOCAL.milestone === 0) {
        legendary = LOCAL_TIERS.legend[(n / LOCAL.milestone - 1) % LOCAL_TIERS.legend.length];
        see(legendary);
      }
      return { counted: true, worldVisits: n, myVisits: n, legendary, visitNumber: legendary ? n : null };
    })());
  },
  async roll() {
    const r = Math.random(), pBig = LOCAL.boost / 5000, pSmall = LOCAL.boost / 500;
    const id = r < pBig ? pick(LOCAL_TIERS.big) : r < pBig + pSmall ? pick(LOCAL_TIERS.small) : null;
    if (id) see(id);
    return id;
  },
  async recordSighting(id) {
    see(id);
  },
  async counts() {
    return Object.fromEntries(load().seen.map((id) => [id, 1]));
  },
  onWorld() {
    return () => {};
  },
};

export const getBackend = (): Backend => (url && key ? supabaseBackend : localBackend);
