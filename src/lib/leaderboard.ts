import { prisma } from "./prisma";

export type LeaderboardEntry = {
  id: string;
  name: string;
  settledNet: number;
  pendingWagered: number;
  hasSettled: boolean;
};

// The weekly points reset runs Monday 11:00 UTC (see vercel.json's cron and
// api/cron/weekly-reset). The leaderboard now follows the same boundary:
// "this week" is everything since the most recent Monday 11:00 UTC, so a
// new week starts with a clean board instead of carrying last week's net
// forward. Nothing is thrown away -- every bet keeps its real createdAt
// forever, so any past week's standings can still be reconstructed with
// getLeaderboardForWeek() even though there's no dedicated history page for
// it yet.
export function getCurrentWeekStart(now: Date = new Date()): Date {
  const d = new Date(now);
  // Walk back to the most recent Monday 11:00 UTC on or before `now`.
  while (true) {
    const monday = new Date(d);
    monday.setUTCHours(11, 0, 0, 0);
    const day = monday.getUTCDay(); // 0 = Sun, 1 = Mon
    const backToMonday = day === 0 ? 6 : day - 1;
    monday.setUTCDate(monday.getUTCDate() - backToMonday);
    if (monday.getTime() <= now.getTime()) return monday;
    d.setUTCDate(d.getUTCDate() - 7);
  }
}

// Only players who've actually placed a bet THIS WEEK show up here -- a
// fresh 1,000-point starting balance isn't a "standing," it's just
// everyone's bankroll.
//
// Ranking:
//   1. Once a player has settled bets this week, their net settled points
//      (wins minus losses, this week only) is what ranks them.
//   2. Until then, they're ranked by how much they currently have wagered
//      this week (pending bets).
//   3. Ties within the pending group go to whoever placed their bet first.
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return getLeaderboardForWeek(getCurrentWeekStart());
}

// Same ranking logic, scoped to any week -- pass the Monday 11:00 UTC that
// started it (see getCurrentWeekStart). Not wired into any page yet, but
// it's how Eric (or a future admin page) can look back at a past week's
// standings without that data having to live anywhere separate -- it's
// already sitting in each bet's createdAt.
export async function getLeaderboardForWeek(weekStart: Date, weekEnd?: Date): Promise<LeaderboardEntry[]> {
  const players = await prisma.user.findMany({
    where: { bets: { some: { createdAt: { gte: weekStart, ...(weekEnd ? { lt: weekEnd } : {}) } } } },
    include: { bets: { where: { createdAt: { gte: weekStart, ...(weekEnd ? { lt: weekEnd } : {}) } } } },
  });

  const entries = players.map((p) => {
    const settled = p.bets.filter((b) => b.outcome !== "PENDING");
    const pending = p.bets.filter((b) => b.outcome === "PENDING");
    const settledNet = settled.reduce((sum, b) => sum + (b.payout || 0), 0);
    const pendingWagered = pending.reduce((sum, b) => sum + b.amount, 0);
    const earliestBetAt = p.bets.reduce(
      (min, b) => (b.createdAt < min ? b.createdAt : min),
      p.bets[0].createdAt
    );
    return {
      id: p.id,
      name: p.name,
      settledNet,
      pendingWagered,
      hasSettled: settled.length > 0,
      earliestBetAt,
    };
  });

  entries.sort((a, b) => {
    if (a.settledNet !== b.settledNet) return b.settledNet - a.settledNet;
    if (a.pendingWagered !== b.pendingWagered) return b.pendingWagered - a.pendingWagered;
    return a.earliestBetAt.getTime() - b.earliestBetAt.getTime();
  });

  return entries.map(({ earliestBetAt, ...rest }) => rest);
}
