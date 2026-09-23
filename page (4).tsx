import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { effectiveStatus } from "@/lib/scheduling";
import { teamLabel } from "@/lib/format";

const statusLabel: Record<string, string> = {
  PENDING_SPREAD: "Draft",
  OPEN: "Betting open",
  LOCKED: "Locked",
  COMPLETED: "Final",
};

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.isAdmin;

  const matches = await prisma.match.findMany({
    // Drafts are for the admin's eyes only -- nobody else sees a match until
    // it's been published.
    where: isAdmin ? undefined : { status: { not: "PENDING_SPREAD" } },
    orderBy: { createdAt: "desc" },
    include: { players: { include: { player: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Matches</h1>
        {isAdmin && (
          <Link
            href="/matches/new"
            className="rounded bg-court-green px-3 py-1.5 text-sm font-medium text-white"
          >
            + Log a match
          </Link>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {matches.map((m) => {
          const teamA = m.players.filter((p) => p.team === "A").map((p) => p.player);
          const teamB = m.players.filter((p) => p.team === "B").map((p) => p.player);
          const status = effectiveStatus(m);
          const isDraft = m.status === "PENDING_SPREAD";
          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className={`flex items-center justify-between rounded border bg-white p-3 hover:border-court-green ${
                  isDraft ? "border-dashed border-court-clay" : "border-neutral-200"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">
                    {teamLabel(teamA)} vs {teamLabel(teamB)}
                  </div>
                  {m.lineForTeamA !== null && (
                    <div className="text-xs text-neutral-500">
                      Line: A {m.lineForTeamA! > 0 ? "+" : ""}
                      {m.lineForTeamA}
                      {isDraft && " (not published)"}
                    </div>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    isDraft ? "bg-amber-100 text-amber-900" : "bg-neutral-100"
                  }`}
                >
                  {statusLabel[status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
