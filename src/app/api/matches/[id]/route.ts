import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { parseScheduledAt, parseTeams } from "@/lib/matchInput";
import { isValidLine } from "@/lib/lines";

// Admin-only: edit a DRAFT match (teams, cutoff time, and/or a saved-but-not-yet-
// published line). Once a match has been published it is locked -- people may
// already have bets riding on it -- so this refuses anything but a draft.
export const PATCH = withAuthError(async (req: NextRequest, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();
  const body = await req.json();

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "PENDING_SPREAD") {
    return NextResponse.json(
      { error: "This match is already published and can't be edited. Cancel it (with refunds) instead." },
      { status: 400 }
    );
  }

  const data: { scheduledAt?: Date | null; lineForTeamA?: number | null } = {};

  if ("scheduledAt" in body) {
    const when = parseScheduledAt(body.scheduledAt);
    if ("error" in when) return NextResponse.json({ error: when.error }, { status: 400 });
    data.scheduledAt = when.value;
  }

  if ("lineForTeamA" in body) {
    if (body.lineForTeamA === null) {
      data.lineForTeamA = null;
    } else if (isValidLine(body.lineForTeamA)) {
      data.lineForTeamA = body.lineForTeamA === 0 ? 0 : body.lineForTeamA; // avoid -0
    } else {
      return NextResponse.json({ error: "The line must be a multiple of 0.5" }, { status: 400 });
    }
  }

  let teams: { a: string[]; b: string[] } | null = null;
  if ("teamA" in body || "teamB" in body) {
    const parsed = await parseTeams(body.teamA, body.teamB);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    teams = parsed;
  }

  await prisma.$transaction(async (tx) => {
    if (teams) {
      await tx.matchPlayer.deleteMany({ where: { matchId: match.id } });
      await tx.matchPlayer.createMany({
        data: [
          ...teams.a.map((playerId) => ({ matchId: match.id, playerId, team: "A" as const })),
          ...teams.b.map((playerId) => ({ matchId: match.id, playerId, team: "B" as const })),
        ],
      });
    }
    if (Object.keys(data).length > 0) {
      await tx.match.update({ where: { id: match.id }, data });
    }
  });

  return NextResponse.json({ ok: true });
});

// Admin-only: delete a DRAFT match. Published matches can't be deleted this
// way (use "Cancel & refund", which returns everyone's points first).
export const DELETE = withAuthError(async (_req: Request, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  await requireAdmin();

  const match = await prisma.match.findUnique({ where: { id: params.id }, include: { bets: true } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "PENDING_SPREAD" || match.bets.length > 0) {
    return NextResponse.json(
      { error: "Only drafts can be deleted. Use Cancel & refund for a published match." },
      { status: 400 }
    );
  }

  await prisma.match.delete({ where: { id: match.id } });
  return NextResponse.json({ ok: true });
});
