import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getMaxBet } from "@/lib/betting";
import { effectiveStatus, isEffectivelyOpen, toCentralDatetimeLocalValue } from "@/lib/scheduling";
import { teamLabel } from "@/lib/format";
import { getLineParams } from "@/lib/lineSettings";
import { suggestLine } from "@/lib/lines";
import DraftPanel from "./DraftPanel";
import BetForm from "./BetForm";
import LockButton from "./LockButton";
import ResultForm from "./ResultForm";
import CancelMatchButton from "./CancelMatchButton";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      players: { include: { player: true } },
      sets: { orderBy: { order: "asc" } },
      bets: { include: { player: true } },
    },
  });
  if (!match) notFound();

  const isDraft = match.status === "PENDING_SPREAD";
  // A draft doesn't exist as far as anyone but the admin is concerned.
  if (isDraft && !me?.isAdmin) notFound();

  const teamA = match.players.filter((p) => p.team === "A");
  const teamB = match.players.filter((p) => p.team === "B");
  const myBet = me ? match.bets.find((b) => b.playerId === me.id) : undefined;
  const status = effectiveStatus(match);
  const bettingOpen = isEffectivelyOpen(match);
  const maxBet = me && bettingOpen && !myBet ? await getMaxBet(me.id) : 0;

  // Admin-only data: the roster for the draft editor, the ratings curve, and
  // the ratings-based read on this matchup. Never rendered for anyone else.
  let allPlayers: {
    id: string;
    name: string;
    individualRating: number | null;
    doublesRating: number | null;
  }[] = [];
  const params_ = me?.isAdmin ? await getLineParams() : null;
  if (me?.isAdmin && isDraft) {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    allPlayers = users.map((u) => ({
      id: u.id,
      name: u.name,
      individualRating: u.individualRating,
      doublesRating: u.doublesRating,
    }));
  }
  const suggestion =
    me?.isAdmin && params_
      ? suggestLine(
          teamA.map((p) => p.player),
          teamB.map((p) => p.player),
          params_
        )
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">
          {teamLabel(teamA.map((p) => p.player))} vs {teamLabel(teamB.map((p) => p.player))}
        </h1>
        {match.scheduledAt && (
          <p className="text-sm text-neutral-500">
            {new Date(match.scheduledAt).toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-sm">
          Status: <span className="font-medium">{isDraft ? "DRAFT" : status.replace("_", " ")}</span>
          {match.status === "OPEN" && !bettingOpen && (
            <span className="ml-1 text-xs text-neutral-500">(cutoff passed)</span>
          )}
        </p>
        {!isDraft && match.lineForTeamA !== null && match.lineForTeamA !== undefined && (
          <p className="text-sm">
            Line: Team A {match.lineForTeamA > 0 ? "+" : ""}
            {match.lineForTeamA} games
          </p>
        )}
      </div>

      {me?.isAdmin && isDraft && params_ && (
        <DraftPanel
          matchId={match.id}
          players={allPlayers}
          initialTeamA={teamA.map((p) => p.playerId)}
          initialTeamB={teamB.map((p) => p.playerId)}
          initialScheduledAt={match.scheduledAt ? toCentralDatetimeLocalValue(match.scheduledAt) : ""}
          initialLine={match.lineForTeamA ?? null}
          params={params_}
        />
      )}

      {me?.isAdmin && !isDraft && suggestion && (
        <section className="rounded border border-neutral-200 bg-white p-3 text-sm">
          <h2 className="mb-1 text-sm font-semibold">Ratings view (only you can see this)</h2>
          <p className="text-neutral-700">
            Team ratings (doubles): A {suggestion.ratingA.toFixed(2)} · B {suggestion.ratingB.toFixed(2)} · gap{" "}
            {suggestion.gap.toFixed(2)}
          </p>
          <p className="text-neutral-700">
            Ratings suggested{" "}
            {suggestion.favorite ? `Team ${suggestion.favorite} by ${suggestion.magnitude}` : "even (pick'em)"}; published line was Team A{" "}
            {match.lineForTeamA! > 0 ? "+" : ""}
            {match.lineForTeamA}.
          </p>
        </section>
      )}

      {me?.isAdmin && match.status === "OPEN" && <LockButton matchId={match.id} />}

      {me?.isAdmin && match.status === "LOCKED" && <ResultForm matchId={match.id} />}

      {me?.isAdmin && (match.status === "OPEN" || match.status === "LOCKED") && (
        <CancelMatchButton matchId={match.id} betCount={match.bets.filter((b) => b.outcome === "PENDING").length} />
      )}

      {bettingOpen && me && !myBet && (
        <BetForm
          matchId={match.id}
          maxBet={maxBet}
          teamAName={teamLabel(teamA.map((p) => p.player))}
          teamBName={teamLabel(teamB.map((p) => p.player))}
        />
      )}

      {myBet && (
        <div className="rounded border border-neutral-200 bg-white p-3 text-sm">
          Your bet: {myBet.amount} pts on Team {myBet.teamPicked}
          {myBet.outcome !== "PENDING" && (
            <span className="ml-2 font-medium">
              — {myBet.outcome} ({myBet.payout! > 0 ? "+" : ""}
              {myBet.payout})
            </span>
          )}
        </div>
      )}

      {match.sets.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Score</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {match.sets.map((s) => (
              <li key={s.id}>
                Set {s.order}: {s.teamAGames}-{s.teamBGames}
                {s.isTiebreak && " (tiebreak, worth 1.5)"}
                {s.isMatchTiebreak && " (match tiebreak, worth 2.5)"}
              </li>
            ))}
          </ul>
          {match.margin !== null && match.margin !== undefined && (
            <p className="mt-1 text-sm font-medium">Final margin (Team A): {match.margin}</p>
          )}
        </section>
      )}

      {match.bets.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Bets</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {match.bets.map((b) => (
              <li key={b.id} className="flex justify-between rounded border border-neutral-200 bg-white px-2 py-1">
                <span>
                  {b.player.name} — Team {b.teamPicked} — {b.amount} pts
                </span>
                <span>{b.outcome !== "PENDING" ? `${b.outcome} (${b.payout! > 0 ? "+" : ""}${b.payout})` : "pending"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
