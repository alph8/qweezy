import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { teamLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyBetsPage() {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;
  if (!me) redirect("/signin");

  const bets = await prisma.bet.findMany({
    where: { playerId: me.id },
    include: { match: { include: { players: { include: { player: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const pending = bets.filter((b) => b.outcome === "PENDING");
  const settled = bets.filter((b) => b.outcome !== "PENDING");

  const teamNames = (match: (typeof bets)[number]["match"], team: "A" | "B") =>
    teamLabel(match.players.filter((p) => p.team === team).map((p) => p.player));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">My bets</h1>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Active</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">No open bets right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/matches/${b.matchId}`}
                  className="flex items-center justify-between rounded border border-neutral-200 bg-white p-3 hover:border-court-green"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {teamNames(b.match, "A")} vs {teamNames(b.match, "B")}
                    </div>
                    <div className="text-xs text-neutral-500">Picked Team {b.teamPicked}</div>
                  </div>
                  <span className="font-mono text-sm">{b.amount} pts at risk</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Settled</h2>
        {settled.length === 0 ? (
          <p className="text-sm text-neutral-500">No settled bets yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {settled.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded border border-neutral-200 bg-white p-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {teamNames(b.match, "A")} vs {teamNames(b.match, "B")}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Picked Team {b.teamPicked} · {b.amount} pts
                  </div>
                </div>
                <span className="font-mono">
                  {b.outcome} ({b.payout! > 0 ? "+" : ""}
                  {b.payout})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
