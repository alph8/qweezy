import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { computeMargin, SetInput } from "@/lib/scoring";
import { applyMatchRatings } from "@/lib/ratings";

// Admin-only: bulk-log matches straight into the ratings engine, bypassing
// betting entirely (no spread, no bets) -- for backfilling a week that
// already happened, or logging a week's lineup where Eric isn't running a
// betting line. Each match can either come with a final score (sets) --
// in which case it's created already COMPLETED and rated -- or with none,
// for a scheduled pairing to be scored later via the normal result form.
//
// Players are matched by name (case/whitespace-insensitive) against the
// existing roster. Unknown names are reported back, never silently
// skipped, so a typo doesn't quietly drop someone's match from their
// record.
//
// POST { dryRun: true, matches: [...] }  -> validate + preview, nothing written.
// POST { dryRun: false, matches: [...] } -> apply.
//
// Each match: { teamA: [name, name], teamB: [name, name], scheduledAt?: string,
//                sets?: SetInput[] }

type MatchInput = {
  teamA: string[];
  teamB: string[];
  scheduledAt?: string | null;
  sets?: SetInput[];
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export const POST = withAuthError(async (req: NextRequest) => {
  const me = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const matches: MatchInput[] = Array.isArray(body?.matches) ? body.matches : [];

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const byName = new Map<string, { id: string; name: string }[]>();
  for (const u of users) {
    const key = norm(u.name);
    byName.set(key, [...(byName.get(key) ?? []), u]);
  }

  const resolveTeam = (names: string[]) => {
    const ids: string[] = [];
    const problems: string[] = [];
    for (const name of names) {
      const hits = byName.get(norm(name)) ?? [];
      if (hits.length === 1) ids.push(hits[0].id);
      else if (hits.length === 0) problems.push(`"${name}" not found on the roster`);
      else problems.push(`"${name}" matches more than one player -- use the exact roster name`);
    }
    return { ids, problems };
  };

  const results = matches.map((m, i) => {
    const a = resolveTeam(m.teamA ?? []);
    const b = resolveTeam(m.teamB ?? []);
    const problems = [...a.problems, ...b.problems];
    if ((m.teamA ?? []).length === 0 || (m.teamB ?? []).length === 0) {
      problems.push("Both teams need at least one player");
    }
    const margin = m.sets && m.sets.length > 0 ? computeMargin(m.sets) : null;
    return { index: i, teamA: a.ids, teamB: b.ids, sets: m.sets ?? [], scheduledAt: m.scheduledAt ?? null, margin, problems };
  });

  const valid = results.filter((r) => r.problems.length === 0);
  const invalid = results.filter((r) => r.problems.length > 0);

  const created: { index: number; matchId: string; margin: number | null; rated: boolean }[] = [];

  if (!dryRun) {
    for (const r of valid) {
      const match = await prisma.match.create({
        data: {
          createdById: me.id,
          ratingOnly: true,
          scheduledAt: r.scheduledAt ? new Date(r.scheduledAt) : null,
          margin: r.margin,
          status: r.margin !== null ? "COMPLETED" : "PENDING_SPREAD",
          players: {
            create: [
              ...r.teamA.map((playerId) => ({ playerId, team: "A" as const })),
              ...r.teamB.map((playerId) => ({ playerId, team: "B" as const })),
            ],
          },
          sets: r.sets.length > 0 ? { create: r.sets } : undefined,
        },
        select: { id: true },
      });

      let rated = false;
      if (r.margin !== null) {
        const outcome = await applyMatchRatings(match.id);
        rated = outcome.applied;
      }
      created.push({ index: r.index, matchId: match.id, margin: r.margin, rated });
    }
  }

  return NextResponse.json({
    dryRun,
    totalSubmitted: matches.length,
    validCount: valid.length,
    invalid: invalid.map((r) => ({ index: r.index, problems: r.problems })),
    created,
  });
});
