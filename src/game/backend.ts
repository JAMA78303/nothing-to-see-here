// The browser's view of the server. All game rules live in src/server/game.ts.

export type Arrival = {
  counted: boolean;
  worldVisits: number;
  myVisits: number;
  legendary: string | null;
  visitNumber: number | null;
};

export type Snapshot = {
  /** "live" on Redis, "local" on the in-memory dev store. */
  mode: "live" | "local";
  milestone: number;
  worldVisits: number;
  myVisits: number;
  seen: string[];
  counts: Record<string, number>;
};

export interface Backend {
  start(): Promise<Snapshot>;
  /** Records this page load as a visit (at most once per page load). */
  arrive(): Promise<Arrival>;
  /** Asks the server for a rare-moment roll. Returns the moment id, or null for nothing. */
  roll(): Promise<string | null>;
  /** Only for links and secrets; rare moments are recorded by the server. */
  recordSighting(id: string): Promise<void>;
  counts(): Promise<Record<string, number>>;
  /** Live world counter. Polls while the page is visible. */
  onWorld(cb: (visits: number) => void): () => void;
}

async function api<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Memoised per page load so React's double-invoked effects can't count a visit twice.
let started: Promise<Snapshot> | null = null;
let arrived: Promise<Arrival> | null = null;

const POLL_MS = 5000;

export const backend: Backend = {
  start: () => (started ??= api<Snapshot>("/api/state")),
  arrive() {
    return (arrived ??= this.start().then(() => api<Arrival>("/api/visit", "POST")));
  },
  roll: async () => (await api<{ moment: string | null }>("/api/roll", "POST")).moment,
  async recordSighting(id) {
    await api("/api/sighting", "POST", { id });
  },
  counts: async () => (await api<{ counts: Record<string, number> }>("/api/world")).counts,
  onWorld(cb) {
    let stopped = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      if (!document.hidden) {
        try {
          cb((await api<{ visits: number }>("/api/world")).visits);
        } catch {
          // Try again next tick.
        }
      }
      if (!stopped) t = setTimeout(tick, POLL_MS);
    };
    t = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  },
};
