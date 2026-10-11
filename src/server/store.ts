import { Redis } from "@upstash/redis";

/** The handful of atomic operations the game needs. */
export interface Store {
  readonly kind: "redis" | "memory";
  /** Sets key only if it doesn't exist, expiring after ttl seconds. True if it was set. */
  claim(key: string, ttlSeconds: number): Promise<boolean>;
  incr(key: string): Promise<number>;
  /** Increments a key and gives it an expiry the first time. */
  incrExpiring(key: string, ttlSeconds: number): Promise<number>;
  getNumber(key: string): Promise<number>;
  hincr(key: string, field: string, by: number): Promise<number>;
  hgetNumber(key: string, field: string): Promise<number>;
  hgetallNumbers(key: string): Promise<Record<string, number>>;
  /** Adds a member to a set. True if it was new. */
  sadd(key: string, member: string): Promise<boolean>;
  smembers(key: string): Promise<string[]>;
}

// Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash database sets UPSTASH_REDIS_REST_*.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

function redisStore(redis: Redis): Store {
  return {
    kind: "redis",
    claim: async (key, ttl) => (await redis.set(key, 1, { nx: true, ex: ttl })) === "OK",
    incr: (key) => redis.incr(key),
    async incrExpiring(key, ttl) {
      const [n] = await redis.pipeline().incr(key).expire(key, ttl, "NX").exec<[number, number]>();
      return n;
    },
    getNumber: async (key) => Number((await redis.get<number>(key)) ?? 0),
    hincr: (key, field, by) => redis.hincrby(key, field, by),
    hgetNumber: async (key, field) => Number((await redis.hget<number>(key, field)) ?? 0),
    async hgetallNumbers(key) {
      const all = (await redis.hgetall<Record<string, number>>(key)) ?? {};
      return Object.fromEntries(Object.entries(all).map(([k, v]) => [k, Number(v)]));
    },
    sadd: async (key, member) => (await redis.sadd(key, member)) === 1,
    smembers: (key) => redis.smembers(key),
  };
}

// In-memory fallback so `npm run dev` works with no setup. Never used in production.
function memoryStore(): Store {
  const kv = new Map<string, { v: number; exp?: number }>();
  const hashes = new Map<string, Map<string, number>>();
  const sets = new Map<string, Set<string>>();
  const live = (key: string) => {
    const e = kv.get(key);
    if (e?.exp && e.exp < Date.now()) kv.delete(key);
    return kv.get(key);
  };
  const hash = (key: string) => hashes.get(key) ?? hashes.set(key, new Map()).get(key)!;
  return {
    kind: "memory",
    async claim(key, ttl) {
      if (live(key)) return false;
      kv.set(key, { v: 1, exp: Date.now() + ttl * 1000 });
      return true;
    },
    async incr(key) {
      const e = live(key) ?? { v: 0 };
      kv.set(key, { ...e, v: e.v + 1 });
      return e.v + 1;
    },
    async incrExpiring(key, ttl) {
      const e = live(key) ?? { v: 0, exp: Date.now() + ttl * 1000 };
      kv.set(key, { ...e, v: e.v + 1 });
      return e.v + 1;
    },
    getNumber: async (key) => live(key)?.v ?? 0,
    async hincr(key, field, by) {
      const h = hash(key);
      h.set(field, (h.get(field) ?? 0) + by);
      return h.get(field)!;
    },
    hgetNumber: async (key, field) => hash(key).get(field) ?? 0,
    hgetallNumbers: async (key) => Object.fromEntries(hash(key)),
    async sadd(key, member) {
      const s = sets.get(key) ?? sets.set(key, new Set()).get(key)!;
      const fresh = !s.has(member);
      s.add(member);
      return fresh;
    },
    smembers: async (key) => [...(sets.get(key) ?? [])],
  };
}

const globalForStore = globalThis as unknown as { ntshStore?: Store };

export function getStore(): Store {
  if (url && token) return (globalForStore.ntshStore ??= redisStore(new Redis({ url, token })));
  if (process.env.NODE_ENV === "production") throw new Error("Redis is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN");
  // Survives hot reloads in dev.
  return (globalForStore.ntshStore ??= memoryStore());
}
