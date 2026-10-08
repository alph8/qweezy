import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Runs every Monday morning (see vercel.json). Gives everyone a fresh 1,000
// points for the week. Points still riding on an open or locked match stay
// committed, so each balance becomes 1,000 minus that player's pending stakes
// (otherwise a reset would hand out free extra points). History is untouched.
//
// Vercel calls this with "Authorization: Bearer <CRON_SECRET>". Anyone else is refused.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.bet.groupBy({
    by: ["playerId"],
    where: { outcome: "PENDING" },
    _sum: { amount: true },
  });
  const atRisk = new Map(pending.map((p) => [p.playerId, p._sum.amount ?? 0]));

  const players = await prisma.user.findMany({ select: { id: true } });
  await prisma.$transaction(
    players.map((p) =>
      prisma.user.update({
        where: { id: p.id },
        data: { balance: Math.max(0, 1000 - (atRisk.get(p.id) ?? 0)) },
      })
    )
  );

  return NextResponse.json({ ok: true, playersReset: players.length });
}
