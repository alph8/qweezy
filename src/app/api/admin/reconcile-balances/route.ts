import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only, one-off: recompute every player's balance from their bet
// history instead of trusting the stored value.
//
// Needed because bets placed before the "deduct the stake immediately"
// fix never touched balance until settlement -- so anyone who placed a
// bet that's still pending is showing a balance that doesn't reflect
// what they've got at risk. This walks every player's bets and rebuilds
// balance = 1000 - (pending stakes) + (net payout from settled bets),
// which matches what the app produces going forward. Safe to run again
// any time balances look off; it's idempotent.
export const POST = withAuthError(async () => {
  await requireAdmin();

  const players = await prisma.user.findMany({ include: { bets: true } });

  const updates = players.map((p) => {
    const pendingStake = p.bets
      .filter((b) => b.outcome === "PENDING")
      .reduce((sum, b) => sum + b.amount, 0);
    const settledPayout = p.bets
      .filter((b) => b.outcome !== "PENDING")
      .reduce((sum, b) => sum + (b.payout || 0), 0);
    const correctBalance = 1000 - pendingStake + settledPayout;
    return { id: p.id, name: p.name, from: p.balance, to: correctBalance };
  });

  const changed = updates.filter((u) => u.from !== u.to);

  await prisma.$transaction(
    changed.map((u) => prisma.user.update({ where: { id: u.id }, data: { balance: u.to } }))
  );

  return NextResponse.json({ ok: true, playersChecked: updates.length, playersFixed: changed });
});
