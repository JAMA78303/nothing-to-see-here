// Tiers and odds. Moment ids and tiers must match the `moments` table in
// supabase/migrations/20261011000000_init.sql.

export type Tier = "small" | "big" | "legend" | "often" | "secret";

export const TIERS: Record<Tier, { label: string; odds: number }> = {
  small: { label: "Small oddity", odds: 500 },
  big: { label: "Bigger moment", odds: 5000 },
  legend: { label: "Legendary", odds: 50000 },
  often: { label: "Everyday", odds: 0 },
  secret: { label: "Secret", odds: 0 },
};

// Tiers the browser is allowed to record itself. Rare tiers are decided on the server.
export const CLIENT_RECORDED: Tier[] = ["often", "secret"];
