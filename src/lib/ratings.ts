// Dynamic doubles-rating engine. Every logged match (betting or
// ratings-only) moves both players' doublesRating -- Elo-style, weighted by
// how lopsided the match was, with new or lightly-played players moving
// faster than players with a long track record.
//
// Team strength = sum of the two partners' doublesRating (Eric's call --
// see lines.ts, which already builds the suggested spread the same way).
//
// Design mirrors how bets are re-settled in this app: every match's rating
// impact is recorded as a MatchRatingAdjustment row per player. To edit or
// undo a result, reverse those rows (subtract the delta back off, decrement
// ratingMatchesPlayed, delete the rows), then -- if there's a new score --
// recompute from scratch. That makes re-entering a score safe no matter how
// many times it happens, the same way "Edit result" is safe for bets.
//
// Tunable via the Setting table (same pattern as the line-suggestion curve
// in lineSettings.ts), with defaults chosen for a small, early-season
// league: movement is real but not wild, and a brand-new player's rating
// catches up quickly.

import { prisma } from "./prisma";

export type RatingParams = {
  // Base rating points a fully-experienced player's doublesRating can move
  // on a single maximally-lopsided match (margin score pinned to 0 or 1).
  baseK: number;
  // How many combined team-rating points of difference corresponds to one
  // "logistic step" in the expected-outcome curve. Smaller = favorites are
  // expected to win more decisively.
  eloScale: number;
  // How many margin-games corresponds to one logistic step when turning
  // the actual score into a 0..1 "how lopsided was this" number. Smaller =
  // a given margin counts as a bigger blowout.
  marginScale: number;
  // K-factor taper: a player's K is baseK * max(1, taperStart - taperStep *
  // ratingMatchesPlayed), floored at 1x once they're experienced.
  taperStart: number;
  taperStep: number;
};

export const DEFAULT_RATING_PARAMS: RatingParams = {
  baseK: 0.5,
  eloScale: 1.2,
  marginScale: 4,
  taperStart: 3,
  taperStep: 0.2,
};

const KEYS = {
  baseK: "rating.baseK",
  eloScale: "rating.eloScale",
  marginScale: "rating.marginScale",
  taperStart: "rating.taperStart",
  taperStep: "rating.taperStep",
} as const;

export async function getRatingParams(): Promise<RatingParams> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    baseK: byKey.get(KEYS.baseK) ?? DEFAULT_RATING_PARAMS.baseK,
    eloScale: byKey.get(KEYS.eloScale) ?? DEFAULT_RATING_PARAMS.eloScale,
    marginScale: byKey.get(KEYS.marginScale) ?? DEFAULT_RATING_PARAMS.marginScale,
    taperStart: byKey.get(KEYS.taperStart) ?? DEFAULT_RATING_PARAMS.taperStart,
    taperStep: byKey.get(KEYS.taperStep) ?? DEFAULT_RATING_PARAMS.taperStep,
  };
}

export async function saveRatingParams(params: RatingParams): Promise<void> {
  await prisma.$transaction(
    (Object.keys(KEYS) as (keyof RatingParams)[]).map((k) =>
      prisma.setting.upsert({
        where: { key: KEYS[k] },
        update: { value: params[k] },
        create: { key: KEYS[k], value: params[k] },
      })
    )
  );
}

function logistic(x: number): number {
  return 1 / (1 + Math.pow(10, -x));
}

// Combined team doubles rating. Falls back to individualRating per player
// when doublesRating isn't set yet (matches lines.ts's teamRating()).
export function teamRating(players: { doublesRating?: number | null; individualRating?: number | null }[]): number | null {
  let sum = 0;
  for (const p of players) {
    const r = p.doublesRating ?? p.individualRating ?? null;
    if (r === null) return null;
    sum += r;
  }
  return sum;
}

// Probability-like expected outcome for Team A, from the combined-rating gap.
export function expectedScoreA(teamARating: number, teamBRating: number, scale: number): number {
  return logistic((teamARating - teamBRating) / scale);
}

// Turns the final margin (Team A's games, after tiebreak weighting --
// same number used to settle bets) into a 0..1 "how lopsided, and who won"
// number. 0.5 = razor-close; approaches 1 as Team A's win gets bigger,
// approaches 0 as Team B's win gets bigger.
export function marginScoreA(margin: number, scale: number): number {
  return logistic(margin / scale);
}

// Per-player K-factor: new/lightly-played players move faster. Floors at
// 1x baseK once a player has enough matches logged.
export function ratingKFactor(ratingMatchesPlayed: number, params: RatingParams): number {
  const taper = Math.max(1, params.taperStart - params.taperStep * ratingMatchesPlayed);
  return params.baseK * taper;
}

export type RatedPlayer = {
  id: string;
  doublesRating: number | null;
  individualRating: number | null;
  ratingMatchesPlayed: number;
};

export type RatingDelta = { playerId: string; delta: number };

// Pure function: given the two teams and the final margin, compute each
// player's signed rating delta. Both partners on a team move by the same
// signed direction (we don't have a way to split credit within a doubles
// pairing), but each player's own K-factor still scales their own move.
export function computeRatingDeltas(
  teamA: RatedPlayer[],
  teamB: RatedPlayer[],
  margin: number,
  params: RatingParams = DEFAULT_RATING_PARAMS
): RatingDelta[] | null {
  const ratingA = teamRating(teamA);
  const ratingB = teamRating(teamB);
  if (ratingA === null || ratingB === null) return null; // can't rate an unrated player

  const expectedA = expectedScoreA(ratingA, ratingB, params.eloScale);
  const actualA = marginScoreA(margin, params.marginScale);
  const surpriseA = actualA - expectedA; // positive = Team A did better than expected

  const deltas: RatingDelta[] = [];
  for (const p of teamA) {
    const k = ratingKFactor(p.ratingMatchesPlayed, params);
    deltas.push({ playerId: p.id, delta: k * surpriseA });
  }
  for (const p of teamB) {
    const k = ratingKFactor(p.ratingMatchesPlayed, params);
    deltas.push({ playerId: p.id, delta: k * -surpriseA });
  }
  return deltas;
}

// Reverses every rating adjustment previously recorded for a match (safe to
// call even if none exist). Call this before re-applying ratings for an
// edited result, or on its own to fully undo a match's rating impact.
export async function reverseMatchRatings(matchId: string): Promise<void> {
  const existing = await prisma.matchRatingAdjustment.findMany({ where: { matchId } });
  if (existing.length === 0) return;
  await prisma.$transaction([
    ...existing.map((adj) =>
      prisma.user.update({
        where: { id: adj.playerId },
        data: {
          doublesRating: { decrement: adj.delta },
          ratingMatchesPlayed: { decrement: 1 },
        },
      })
    ),
    prisma.matchRatingAdjustment.deleteMany({ where: { matchId } }),
  ]);
}

// Applies ratings for a match that's just gotten (or re-gotten) a result.
// Always reverses any prior adjustment for this match first, so it's safe
// to call on every result edit, not just the first time. No-ops (after the
// reversal) if either team has an unrated player.
export async function applyMatchRatings(matchId: string): Promise<{ applied: boolean; reason?: string }> {
  await reverseMatchRatings(matchId);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: { include: { player: true } } },
  });
  if (!match || match.margin === null) return { applied: false, reason: "No result on this match yet" };

  const teamA = match.players.filter((mp) => mp.team === "A").map((mp) => mp.player);
  const teamB = match.players.filter((mp) => mp.team === "B").map((mp) => mp.player);
  if (teamA.length === 0 || teamB.length === 0) {
    return { applied: false, reason: "Match doesn't have both teams set" };
  }

  const params = await getRatingParams();
  const deltas = computeRatingDeltas(teamA, teamB, match.margin, params);
  if (!deltas) return { applied: false, reason: "One or more players has no rating yet" };

  await prisma.$transaction([
    ...deltas.map((d) =>
      prisma.matchRatingAdjustment.create({
        data: { matchId, playerId: d.playerId, delta: d.delta },
      })
    ),
    ...deltas.map((d) =>
      prisma.user.update({
        where: { id: d.playerId },
        data: {
          doublesRating: { increment: d.delta },
          ratingMatchesPlayed: { increment: 1 },
        },
      })
    ),
  ]);

  return { applied: true };
}
