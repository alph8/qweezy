import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { computeMargin, settleBet, payoutFor, SetInput } from "@/lib/scoring";
import { applyMatchRatings, reverseMatchRatings } from "@/lib/ratings";

// Admin-only: enter or edit the final score. Settles every bet on this
// match (if any -- a ratingOnly match has none) and updates both players'
// doublesRating.
//
// Safe to call more than once on the same match ("Edit result"): every
// bet's PREVIOUS outcome is reversed (its balance credit undone) before
// the new score is graded, and every rating adjustment from the previous
// score is reversed before the new one is applied. So re-submitting a
// corrected score never double-credits a balance or double-moves a
// rating, no matter how many times it happens.
export const POST = withAuthError(async (req: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();
  const { sets } = (await req.json()) as { sets: SetInput[] };

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: params.id },
    include: { bets: true },
  });

  if (match.status === "PENDING_SPREAD" && !match.ratingOnly) {
    return NextResponse.json({ error: "Publish the match before entering a result" }, { status: 400 });
  }
  if (!match.ratingOnly && (match.lineForTeamA === null || match.lineForTeamA === undefined)) {
    return NextResponse.json({ error: "Set a spread before entering a result" }, { status: 400 });
  }

  const margin = computeMargin(sets);

  await prisma.$transaction(async (tx) => {
    // Reverse every bet's PREVIOUS credit before re-grading, so re-entering
    // a score is always safe -- a bet that was already settled gets its old
    // balance effect undone first instead of stacking a second credit on
    // top of the first.
    for (const bet of match.bets) {
      if (bet.outcome !== "PENDING" && bet.payout !== null) {
        const oldCredit = bet.payout + bet.amount;
        if (oldCredit !== 0) {
          await tx.user.update({ where: { id: bet.playerId }, data: { balance: { decrement: oldCredit } } });
        }
      }
    }

    await tx.set.deleteMany({ where: { matchId: match.id } });
    await tx.set.createMany({ data: sets.map((s) => ({ ...s, matchId: match.id })) });

    for (const bet of match.bets) {
      const outcome = settleBet(bet.teamPicked, margin, match.lineForTeamA ?? 0);
      const payout = payoutFor(outcome, bet.amount);
      const balanceCredit = payout + bet.amount;

      await tx.bet.update({ where: { id: bet.id }, data: { outcome, payout } });
      if (balanceCredit !== 0) {
        await tx.user.update({ where: { id: bet.playerId }, data: { balance: { increment: balanceCredit } } });
      }
    }

    await tx.match.update({ where: { id: match.id }, data: { margin, status: "COMPLETED" } });
  });

  const rating = await applyMatchRatings(match.id);

  return NextResponse.json({ ok: true, margin, rating });
});

// Admin-only: undo a result entirely. Every bet goes back to PENDING with
// its stake restored, every rating adjustment from this match is reversed,
// the score is cleared, and the match goes back to LOCKED (or stays
// PENDING_SPREAD for a ratingOnly match) awaiting a result -- as if it had
// never been entered. This is the one to use for testing a what-if score.
export const DELETE = withAuthError(async (_req: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: params.id },
    include: { bets: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const bet of match.bets) {
      if (bet.outcome !== "PENDING" && bet.payout !== null) {
        const oldCredit = bet.payout + bet.amount;
        if (oldCredit !== 0) {
          await tx.user.update({ where: { id: bet.playerId }, data: { balance: { decrement: oldCredit } } });
        }
        await tx.bet.update({ where: { id: bet.id }, data: { outcome: "PENDING", payout: null } });
      }
    }

    await tx.set.deleteMany({ where: { matchId: match.id } });
    await tx.match.update({
      where: { id: match.id },
      data: { margin: null, status: match.ratingOnly ? "PENDING_SPREAD" : "LOCKED" },
    });
  });

  await reverseMatchRatings(match.id);

  return NextResponse.json({ ok: true });
});
