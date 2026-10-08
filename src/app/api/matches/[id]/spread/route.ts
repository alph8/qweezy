import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { isValidLine } from "@/lib/lines";

// Admin-only: PUBLISH a draft. Locks in the line and opens betting.
//
// The line is Team A's perspective and must be a multiple of 0.5 (0 is a
// pick'em). Once published the line can't change: bets get placed against it,
// so quietly moving it would change what people already bet on.
export const POST = withAuthError(async (req: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();
  const { lineForTeamA } = (await req.json()) as { lineForTeamA: number };

  if (!isValidLine(lineForTeamA)) {
    return NextResponse.json({ error: "The line must be a multiple of 0.5 (0 for even)" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id }, include: { players: true } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "PENDING_SPREAD") {
    return NextResponse.json(
      { error: "This match is already published. Its line can't be changed once betting has opened." },
      { status: 400 }
    );
  }
  if (!match.players.some((p) => p.team === "A") || !match.players.some((p) => p.team === "B")) {
    return NextResponse.json({ error: "Both teams need at least one player" }, { status: 400 });
  }

  const published = await prisma.match.update({
    where: { id: match.id },
    data: { lineForTeamA: lineForTeamA === 0 ? 0 : lineForTeamA, status: "OPEN" },
    select: { id: true, status: true, lineForTeamA: true },
  });

  return NextResponse.json(published);
});
