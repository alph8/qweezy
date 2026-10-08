import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requirePlayer, withAuthError } from "@/lib/session";
import { getMaxBet } from "@/lib/betting";
import { isEffectivelyOpen } from "@/lib/scheduling";

export const POST = withAuthError(async (req: NextRequest) => {
  const me = await requirePlayer();
  const { matchId, teamPicked, amount } = (await req.json()) as {
    matchId: string;
    teamPicked: "A" | "B";
    amount: number;
  };

  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  if (!isEffectivelyOpen(match)) {
    return NextResponse.json({ error: "Betting isn't open on this match" }, { status: 400 });
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Bet amount must be a positive whole number" }, { status: 400 });
  }

  const maxBet = await getMaxBet(me.id);
  if (amount > maxBet) {
    return NextResponse.json({ error: `Max bet is ${maxBet} points per match` }, { status: 400 });
  }

  const existing = await prisma.bet.findUnique({
    where: { matchId_playerId: { matchId, playerId: me.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a bet on this match" }, { status: 400 });
  }

  // Move the stake out of the player's available balance the moment the bet
  // is placed, not just when it settles -- otherwise the balance shown in
  // the nav bar (and used to cap bets on other open matches) doesn't
  // reflect points that are already at risk. Re-check the balance inside
  // the transaction to guard against two bets racing past the earlier
  // maxBet check.
  const bet = await prisma.$transaction(async (tx) => {
    const player = await tx.user.findUniqueOrThrow({ where: { id: me.id } });
    if (amount > player.balance) {
      throw new AuthError(`Max bet is ${player.balance} points per match`, 400);
    }
    const created = await tx.bet.create({
      data: { matchId, playerId: me.id, teamPicked, amount },
    });
    await tx.user.update({
      where: { id: me.id },
      data: { balance: { decrement: amount } },
    });
    return created;
  });

  return NextResponse.json(bet);
});
