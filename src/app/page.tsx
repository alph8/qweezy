import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEffectivelyOpen } from "@/lib/scheduling";
import { getLeaderboard } from "@/lib/leaderboard";
import { teamLabel } from "@/lib/format";
import InviteFriends from "@/components/InviteFriends";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;

  const [leaderboard, openMatchesRaw] = await Promise.all([
    getLeaderboard(),
    prisma.match.findMany({
      where: { status: "OPEN" },
      include: { players: { include: { player: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  // A match past its scheduled cutoff is effectively locked, even if
  // nobody has clicked "Lock" yet — don't invite bets on it here.
  const openMatches = openMatchesRaw.filter(isEffectivelyOpen);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold">Qweezy</h1>
        <p className="mt-1 text-sm text-neutral-600">
          You have 1,000 points each week to wager on the matches below....Good luck!!
        </p>
        {!me && (
          <Link
            href="/signin"
            className="mt-3 inline-block rounded bg-court-green px-4 py-2 text-sm font-medium text-white"
          >
            Sign in to play
          </Link>
        )}
      </section>

      {me && <InviteFriends />}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open for betting</h2>
          <Link href="/matches" className="text-sm text-court-green underline">
            All matches
          </Link>
        </div>
        {openMatches.length === 0 ? (
          <p className="text-sm text-neutral-500">There are currently no matches to wager.</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-court-green">Please place your bets below!</p>
            <ul className="flex flex-col gap-2">
              {openMatches.map((m) => {
                const teamA = m.players.filter((p) => p.team === "A").map((p) => p.player);
                const teamB = m.players.filter((p) => p.team === "B").map((p) => p.player);
                return (
                  <li key={m.id}>
                    <Link
                      href={`/matches/${m.id}`}
                      className="block rounded border border-neutral-200 bg-white p-3 hover:border-court-green"
                    >
                      <div className="text-sm font-medium">
                        {teamLabel(teamA)} vs {teamLabel(teamB)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Line: Team A {m.lineForTeamA! > 0 ? "+" : ""}
                        {m.lineForTeamA}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <Link href="/leaderboard" className="text-sm text-court-green underline">
            Full leaderboard
          </Link>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-neutral-500">Nobody's placed a bet yet.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {leaderboard.slice(0, 10).map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  <span className="mr-2 text-neutral-400">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="font-mono">
                  {p.hasSettled ? `${p.settledNet >= 0 ? "+" : ""}${p.settledNet} pts` : `Risking ${p.pendingWagered} pts`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
