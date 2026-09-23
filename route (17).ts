import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { computeMargin, settleBet, payoutFor, SetInput } from "@/lib/scoring";

// Admin-only: enter the final score, settle every bet on this match,
// and adjust player balances accordingly. Sets are entered in order.
export const POST = withAuthError(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const { sets } = (await req.json()) as { sets: SetInput[] };

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: params.id },
    include: { bets: true },
  });

  if (match.status === "PENDING_SPREAD") {
    return NextResponse.json({ error: "Publish the match before entering a result" }, { status: 400 });
  }

  if (match.lineForTeamA === null || match.lineForTeamA === undefined) {
    return NextResponse.json({ error: "Set a spread before entering a result" }, { status: 400 });
  }

  const margin = computeMargin(sets);

  await prisma.$transaction(async (tx) => {
    // Replace any previously entered sets (in case of a correction).
    await tx.set.deleteMany({ where: { matchId: match.id } });
    await tx.set.createMany({
      data: sets.map((s) => ({ ...s, matchId: match.id })),
    });

    for (const bet of match.bets) {
      const outcome = settleBet(bet.teamPicked, margin, match.lineForTeamA!);
      // `payout` is the net profit/loss shown to the player (+amount on a
      // win, -amount on a loss, 0 on a push). The stake itself was already
      // moved out of their balance when they placed the bet, so crediting
      // it back here means: return the stake, then apply the net result on
      // top -- a win returns 2x the stake, a loss returns nothing, a push
      // returns exactly the stake.
      const payout = payoutFor(outcome, bet.amount);
      const balanceCredit = payout + bet.amount;

      await tx.bet.update({
        where: { id: bet.id },
        data: { outcome, payout },
      });

      if (balanceCredit !== 0) {
        await tx.user.update({
          where: { id: bet.playerId },
          data: { balance: { increment: balanceCredit } },
        });
      }
    }

    await tx.match.update({
      where: { id: match.id },
      data: { margin, status: "COMPLETED" },
    });
  });

  return NextResponse.json({ ok: true, margin });
});
