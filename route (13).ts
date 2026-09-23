import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { parseScheduledAt, parseTeams } from "@/lib/matchInput";

// Admin-only: Eric logs a match with its two doubles teams. It starts as a
// DRAFT (status PENDING_SPREAD) that only he can see. He can edit or delete
// it freely until he publishes it, which opens betting.
export const POST = withAuthError(async (req: NextRequest) => {
  const me = await requireAdmin();
  const body = await req.json();

  const teams = await parseTeams(body?.teamA, body?.teamB);
  if ("error" in teams) return NextResponse.json({ error: teams.error }, { status: 400 });

  const when = parseScheduledAt(body?.scheduledAt);
  if ("error" in when) return NextResponse.json({ error: when.error }, { status: 400 });

  const match = await prisma.match.create({
    data: {
      createdById: me.id,
      scheduledAt: when.value,
      players: {
        create: [
          ...teams.a.map((playerId) => ({ playerId, team: "A" as const })),
          ...teams.b.map((playerId) => ({ playerId, team: "B" as const })),
        ],
      },
    },
    select: { id: true, status: true },
  });

  return NextResponse.json(match);
});

// Public listing. Drafts are hidden from everyone but the admin, and other
// users only ever get names + individual (NTRP) ratings -- no emails, no
// doubles/team ratings, no balances.
export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as any)?.isAdmin;

  const matches = await prisma.match.findMany({
    where: isAdmin ? undefined : { status: { not: "PENDING_SPREAD" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      lineForTeamA: true,
      margin: true,
      players: {
        select: {
          team: true,
          player: { select: { id: true, name: true, individualRating: true } },
        },
      },
      sets: { orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(matches);
}
