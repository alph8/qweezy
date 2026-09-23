// Display helpers. The individual (USTA/NTRP) rating is shown next to a
// player's name for everyone; the doubles rating is never shown here.

export type NamedPlayer = { name: string; individualRating?: number | null };

export function formatRating(r: number | null | undefined): string | null {
  return r === null || r === undefined ? null : r.toFixed(1);
}

export function playerLabel(p: NamedPlayer): string {
  const r = formatRating(p.individualRating);
  return r ? `${p.name} (${r})` : p.name;
}

export function teamLabel(players: NamedPlayer[]): string {
  return players.map(playerLabel).join(" / ");
}
