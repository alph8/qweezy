import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: cancel a PUBLISHED match that hasn't been settled yet
// (betting open or locked). Every pending bet is refunded -- the stake was
// taken out of the player's balance when they placed it, so it goes straight
// back -- and then the match and its bets are deleted. A completed match has
// already paid out, so it can't be cancelled here.
export const POST = withAuthError(async (_req: Request, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();

  const match = await prisma.match.findUnique({ where: { id: params.id }, include: { bets: true } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status === "COMPLETED") {
    return NextResponse.json({ error: "This match is already settled and can't be cancelled." }, { status: 400 });
  }
  if (match.status === "PENDING_SPREAD") {
    return NextResponse.json({ error: "This match is still a draft -- just delete it." }, { status: 400 });
  }

  const refundable = match.bets.filter((b) => b.outcome === "PENDING");
  const refundedPoints = refundable.reduce((sum, b) => sum + b.amount, 0);

  await prisma.$transaction(async (tx) => {
    for (const bet of refundable) {
      await tx.user.update({
        where: { id: bet.playerId },
        data: { balance: { increment: bet.amount } },
      });
    }
    // Cascades to this match's bets, sets and player entries.
    await tx.match.delete({ where: { id: match.id } });
  });

  return NextResponse.json({ ok: true, betsRefunded: refundable.length, pointsRefunded: refundedPoints });
});
