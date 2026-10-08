import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";
import { ROSTER, ROSTER_ALIASES } from "@/lib/roster";

// Admin-only: load the roster + ratings from the spreadsheet (src/lib/roster.ts).
//
// Players in Qweezy are sign-in accounts, so each roster name is matched to an
// existing player by name (ignoring case, extra spaces, and the known
// spelling variants in ROSTER_ALIASES) and gets its ratings filled in. Names
// that don't match anyone can optionally be added as new players with a
// placeholder email (fix it later via "Edit name / email" when the person
// is ready to sign in).
//
// IMPORTANT: doublesRating is now a LIVE rating that moves with every
// logged match (see lib/ratings.ts) -- it is only ever SEEDED here, never
// overwritten. Re-running this import after matches have been logged will
// not wipe out anyone's progress. individualRating, teamNumber and teamRank
// stay admin-set from the sheet and are always refreshed.
//
// POST { dryRun: true }  -> preview only, nothing is written.
// POST { dryRun: false, createMissing: true|false } -> apply.
// Safe to re-run at any time.

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const resolveRosterName = (name: string) => ROSTER_ALIASES[norm(name)] ?? name;

const placeholderEmail = (name: string) =>
  `${norm(name).replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@roster.qweezy.invalid`;

export const POST = withAuthError(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false; // preview unless explicitly told to apply
  const createMissing = body?.createMissing === true;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, doublesRating: true },
  });
  const byName = new Map<string, typeof users>();
  for (const u of users) {
    const key = norm(u.name);
    byName.set(key, [...(byName.get(key) ?? []), u]);
  }

  const matched: string[] = [];
  const toCreate: string[] = [];
  const ambiguous: string[] = [];

  const updates: { id: string; data: Record<string, number | null> }[] = [];
  const creates: { name: string; email: string; data: Record<string, number | null> }[] = [];

  for (const r of ROSTER) {
    const staticFields = {
      individualRating: r.individualRating,
      teamNumber: r.teamNumber,
      teamRank: r.teamRank,
    };
    const hits = byName.get(norm(resolveRosterName(r.name))) ?? [];
    if (hits.length === 1) {
      matched.push(r.name);
      const seedDoubles: Record<string, number | null> = hits[0].doublesRating === null ? { doublesRating: r.doublesRating } : {};
      updates.push({ id: hits[0].id, data: { ...staticFields, ...seedDoubles } });
    } else if (hits.length > 1) {
      ambiguous.push(r.name);
    } else {
      toCreate.push(r.name);
      creates.push({ name: r.name, email: placeholderEmail(r.name), data: { ...staticFields, doublesRating: r.doublesRating } });
    }
  }

  // People already in the app who didn't line up with any roster name --
  // handy for spotting a nickname/spelling difference not yet covered by
  // ROSTER_ALIASES.
  const rosterKeys = new Set(ROSTER.map((r) => norm(resolveRosterName(r.name))));
  const notInRoster = users.filter((u) => !rosterKeys.has(norm(u.name))).map((u) => u.name);

  if (!dryRun) {
    await prisma.$transaction([
      ...updates.map((u) => prisma.user.update({ where: { id: u.id }, data: u.data })),
      ...(createMissing
        ? creates.map((c) =>
            prisma.user.upsert({
              where: { email: c.email },
              update: c.data,
              create: { name: c.name, email: c.email, ...c.data },
            })
          )
        : []),
    ]);
  }

  return NextResponse.json({
    dryRun,
    createMissing,
    matched,
    toCreate,
    created: !dryRun && createMissing ? toCreate : [],
    ambiguous,
    notInRoster,
    rosterSize: ROSTER.length,
  });
});
