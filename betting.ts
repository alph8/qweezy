import { prisma } from "./prisma";

// Flat per-bet cap. Simpler than dividing balance across however many
// matches happen to be open at the moment (that approach punished you
// for betting early, since the max shrank as Eric posted more matches
// later in the night) — everyone just gets the same ceiling per match,
// every week, regardless of balance or how many matches are on.
export const MAX_BET = 250;

export async function getMaxBet(playerId: string): Promise<number> {
  const player = await prisma.user.findUniqueOrThrow({ where: { id: playerId } });
  return Math.max(0, Math.min(MAX_BET, player.balance));
}
