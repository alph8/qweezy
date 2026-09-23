import { prisma } from "./prisma";

// Shared validation for the teams on a match. Returns the cleaned player id
// lists, or an error message. Server-only (checks the players exist).
export async function parseTeams(
  teamA: unknown,
  teamB: unknown
): Promise<{ a: string[]; b: string[] } | { error: string }> {
  const clean = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  const a = clean(teamA);
  const b = clean(teamB);

  if (a.length === 0 || b.length === 0) {
    return { error: "Both teams need at least one player" };
  }
  const all = [...a, ...b];
  if (new Set(all).size !== all.length) {
    return { error: "A player can only appear once in a match" };
  }
  const found = await prisma.user.count({ where: { id: { in: all } } });
  if (found !== all.length) {
    return { error: "One or more selected players no longer exist" };
  }
  return { a, b };
}

// Parses an ISO date string from the client; null/empty means "no cutoff".
export function parseScheduledAt(v: unknown): { value: Date | null } | { error: string } {
  if (v === null || v === undefined || v === "") return { value: null };
  if (typeof v !== "string") return { error: "Invalid cutoff time" };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { error: "Invalid cutoff time" };
  return { value: d };
}
