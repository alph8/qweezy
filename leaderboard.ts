import { prisma } from "./prisma";

export type LeaderboardEntry = {
  id: string;
  name: string;
  settledNet: number;
  pendingWagered: number;
  hasSettled: boolean;
};

// Only players who've actually placed a bet show up here — a fresh
// 1,000-point starting balance isn't a "standing," it's just everyone's
// bankroll.
//
// Ranking:
//   1. Once a player has settled bets, their net settled points (wins
//      minus losses) is what ranks them — this is the "real" standing.
//   2. Until then, they're ranked by how much they currently have
//      wagered (pending bets) — so if three people bet a combined 1,000
//      pts and a fourth only risked 800, the 1,000-pt group sits above
//      the 800-pt bettor.
//   3. Ties within the pending group go to whoever placed their bet
//      first.
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const players = await prisma.user.findMany({
    where: { bets: { some: {} } },
    include: { bets: true },
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
