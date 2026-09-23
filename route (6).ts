import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: reset every player's balance back to 1,000 points.
// Match/bet history is left untouched — this only touches balances, so
// it's safe to use to clear out test bets or start a fresh "season"
// without losing the log of who's played.
export const POST = withAuthError(async () => {
  await requireAdmin();
  const { count } = await prisma.user.updateMany({ data: { balance: 1000 } });
  return NextResponse.json({ ok: true, playersReset: count });
});
