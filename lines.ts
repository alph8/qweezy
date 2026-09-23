// Pure helpers (no database, safe to import from client components) for
// turning team ratings into a suggested spread.
//
// The suggestion is only a starting point -- Eric always confirms or edits
// it before a match is published. Lines are whole or half points, from 0
// upward (a game is 1 point, 1st/2nd-set tiebreak 1.5, 3rd-set tiebreak
// 2.5 -- see scoring.ts).
//
// Curve: magnitude = scale * gap^exponent, rounded to the nearest 0.5,
// where gap is the difference between the two teams' combined doubles
// ratings. Calibrated to Eric's own calls (gap 0.3 -> about 4, gap 1.0 ->
// about 9 to 10) and tunable from the admin Players page.

export type LineParams = { scale: number; exponent: number };

export const DEFAULT_LINE_PARAMS: LineParams = { scale: 9.5, exponent: 0.72 };

export type RatedPlayer = {
  doublesRating?: number | null;
  individualRating?: number | null;
};

const round2 = (x: number) => Math.round(x * 100) / 100;

export function roundToHalf(x: number): number {
  return Math.round(x * 2) / 2;
}

// A player's doubles rating, falling back to their individual rating when
// no separate projection exists (matches the source spreadsheet).
export function playerDoublesRating(p: RatedPlayer): number | null {
  return p.doublesRating ?? p.individualRating ?? null;
}

// Combined doubles rating of a team, or null if any player is unrated.
export function teamRating(players: RatedPlayer[]): number | null {
  if (players.length === 0) return null;
  let sum = 0;
  for (const p of players) {
    const r = playerDoublesRating(p);
    if (r === null || r === undefined) return null;
    sum += r;
  }
  return round2(sum);
}

export function lineMagnitudeForGap(gap: number, params: LineParams): number {
  if (!(gap > 0)) return 0;
  return roundToHalf(params.scale * Math.pow(gap, params.exponent));
}

export type LineSuggestion = {
  ratingA: number;
  ratingB: number;
  gap: number;
  favorite: "A" | "B" | null; // null = even (pick'em)
  magnitude: number; // 0, 0.5, 1, ...
  lineForTeamA: number; // signed, Team A perspective (negative = A favored)
};

export function suggestLine(
  teamA: RatedPlayer[],
  teamB: RatedPlayer[],
  params: LineParams
): LineSuggestion | null {
  const ratingA = teamRating(teamA);
  const ratingB = teamRating(teamB);
  if (ratingA === null || ratingB === null) return null;
  const gap = round2(Math.abs(ratingA - ratingB));
  const magnitude = lineMagnitudeForGap(gap, params);
  const favorite = magnitude === 0 ? null : ratingA > ratingB ? "A" : "B";
  return {
    ratingA,
    ratingB,
    gap,
    favorite,
    magnitude,
    lineForTeamA: toSignedLine(favorite, magnitude),
  };
}

// Favorite + size -> the signed Team A line the rest of the app stores.
export function toSignedLine(favorite: "A" | "B" | null, magnitude: number): number {
  if (magnitude === 0 || favorite === null) return 0;
  return favorite === "A" ? -magnitude : magnitude;
}

// Signed Team A line -> favorite + size.
export function splitLine(lineForTeamA: number): { favorite: "A" | "B" | null; magnitude: number } {
  if (lineForTeamA === 0) return { favorite: null, magnitude: 0 };
  return lineForTeamA < 0
    ? { favorite: "A", magnitude: -lineForTeamA }
    : { favorite: "B", magnitude: lineForTeamA };
}

// A line must be a multiple of 0.5 (including 0) and a sane size.
export function isValidLine(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 50 && Number.isInteger(n * 2);
}
