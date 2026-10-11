// Tiers, odds and which moments the server can roll. The client engine
// defines how each moment plays; ids here must match the ids there.

export type Tier = "small" | "big" | "legend" | "often" | "secret";

export const TIERS: Record<Tier, { label: string; odds: number }> = {
  small: { label: "Small oddity", odds: 500 },
  big: { label: "Bigger moment", odds: 5000 },
  legend: { label: "Legendary", odds: 50000 },
  often: { label: "Everyday", odds: 0 },
  secret: { label: "Secret", odds: 0 },
};

export const MOMENT_IDS: Record<Tier, string[]> = {
  small: ["grape", "pigeon", "sneeze", "shadow", "hello", "twin", "knock", "leave", "timer", "pressure"],
  big: ["ferrets", "backflip", "tux", "violin", "cake"],
  legend: ["nesting", "disco", "ufo", "confess"],
  often: ["link", "video"],
  secret: ["belt"],
};

// Tiers the browser is allowed to record itself. Rare tiers are decided on the server.
export const CLIENT_RECORDED: Tier[] = ["often", "secret"];
