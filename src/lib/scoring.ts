// Core "the house" scoring rules.
//
// Each set contributes a signed "game value" to Team A's overall margin:
//   - A normally-completed set counts its actual game differential
//     (e.g. 6-4 -> +2 for the winner).
//   - A set decided by a standard tiebreak (1st or 2nd set, e.g. 7-6)
//     counts as a fixed 1.5 games for whichever team won it, regardless
//     of the actual tiebreak score.
//   - A 3rd-set match tiebreak (a "super tiebreak" played instead of a
//     full third set, e.g. first to 10) counts as a fixed 2.5 games for
//     whichever team won it.
//
// The match's overall margin is the sum of each set's signed value,
// from Team A's perspective (positive = Team A ahead).
//
// The spread (lineForTeamA) is also expressed from Team A's perspective:
//   lineForTeamA = -5  => Team A is favored by 5 games (must win by >5 to cover)
//   lineForTeamA = +3  => Team A is getting 3 games (can lose by <3 games, or win outright)
//
// A bet on Team A wins if (margin + lineForTeamA) > 0, loses if < 0, pushes if == 0.
// A bet on Team B is the exact opposite.

export type SetInput = {
  order: number;
  teamAGames: number;
  teamBGames: number;
  isTiebreak: boolean; // 1st/2nd set decided by a standard breaker
  isMatchTiebreak: boolean; // 3rd-set match/super tiebreak
};

export function setValue(set: SetInput): number {
  const rawDiff = set.teamAGames - set.teamBGames;
  const sign = rawDiff > 0 ? 1 : rawDiff < 0 ? -1 : 0;

  if (set.isMatchTiebreak) return sign * 2.5;
  if (set.isTiebreak) return sign * 1.5;
  return rawDiff;
}

export function computeMargin(sets: SetInput[]): number {
  return sets.reduce((total, s) => total + setValue(s), 0);
}

export type BetSettlement = "WIN" | "LOSS" | "PUSH";

// Settles a single team's bet against the final margin + line.
export function settleBet(
  teamPicked: "A" | "B",
  margin: number,
  lineForTeamA: number
): BetSettlement {
  const adjusted = margin + lineForTeamA; // from Team A bettor's perspective
  if (adjusted === 0) return "PUSH";
  const teamAWins = adjusted > 0;
  if (teamPicked === "A") return teamAWins ? "WIN" : "LOSS";
  return teamAWins ? "LOSS" : "WIN";
}

// Even-money payout: win doubles your stake back (net +amount),
// loss forfeits the stake (net -amount), push returns the stake (net 0).
export function payoutFor(outcome: BetSettlement, amount: number): number {
  if (outcome === "WIN") return amount;
  if (outcome === "LOSS") return -amount;
  return 0;
}
