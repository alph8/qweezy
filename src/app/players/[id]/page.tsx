import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { teamLabel, formatRating } from "@/lib/format";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EditPlayerForm from "./EditPlayerForm";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.isAdmin;
  // Player profiles (balances, emails, ratings) are admin-only.
  if (!isAdmin) redirect("/matches");

  const player = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      bets: { include: { match: { include: { players: { include: { player: true } } } } } },
      matchEntries: {
        include: { match: { include: { players: { include: { player: true } } } } },
      },
    },
  });
  if (!player) notFound();

  const settled = player.bets.filter((b) => b.outcome !== "PENDING");
  const wins = settled.filter((b) => b.outcome === "WIN").length;
  const losses = settled.filter((b) => b.outcome === "LOSS").length;
  const pushes = settled.filter((b) => b.outcome === "PUSH").length;
  const netPoints = settled.reduce((sum, b) => sum + (b.payout || 0), 0);

  const matchesPlayed = player.matchEntries.length;
  const matchWins = player.matchEntries.filter((e) => {
    const m = e.match;
    if (m.margin === null || m.margin === undefined) return false;
    return e.team === "A" ? m.margin > 0 : m.margin < 0;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{player.name}</h1>
        <p className="text-sm text-neutral-500">Balance: {player.balance} pts</p>
        {player.individualRating !== null && (
          <p className="text-sm text-neutral-500">
            Individual {formatRating(player.individualRating)} · Doubles {formatRating(player.doublesRating) ?? "—"}
            {player.teamNumber !== null &&
              ` · Team ${player.teamNumber}${player.teamRank !== null ? ` (ranked #${player.teamRank} of 30)` : ""}`}
          </p>
        )}
        {isAdmin && (
          <div className="mt-2">
            <EditPlayerForm playerId={player.id} currentName={player.name} currentEmail={player.email} />
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bet record" value={`${wins}-${losses}-${pushes}`} />
        <Stat label="Net pts (betting)" value={netPoints > 0 ? `+${netPoints}` : `${netPoints}`} />
        <Stat label="Matches played" value={`${matchesPlayed}`} />
        <Stat label="Match wins" value={`${matchWins}`} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Bet history</h2>
        {settled.length === 0 ? (
          <p className="text-sm text-neutral-500">No settled bets yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {settled.map((b) => {
              const teamA = b.match.players.filter((p) => p.team === "A").map((p) => p.player);
              const teamB = b.match.players.filter((p) => p.team === "B").map((p) => p.player);
              return (
                <li key={b.id} className="rounded border border-neutral-200 bg-white p-2 text-sm">
                  <div>
                    {teamLabel(teamA)} vs {teamLabel(teamB)} — picked Team {b.teamPicked}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {b.amount} pts · {b.outcome} · {b.payout! > 0 ? "+" : ""}
                    {b.payout}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
