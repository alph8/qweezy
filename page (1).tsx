import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLineParams } from "@/lib/lineSettings";
import { formatRating } from "@/lib/format";
import InvitePlayerForm from "./InvitePlayerForm";
import ImportPlayersForm from "./ImportPlayersForm";
import ImportRosterPanel from "./ImportRosterPanel";
import LineSettingsForm from "./LineSettingsForm";
import ResetBalancesButton from "./ResetBalancesButton";
import ReconcileBalancesButton from "./ReconcileBalancesButton";

export const dynamic = "force-dynamic";

// The full roster (emails, ratings, balances) is for the admin only. Everyone
// else just sees player names and individual ratings on the matches.
export default async function PlayersPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.isAdmin;
  if (!isAdmin) redirect("/matches");

  const [players, lineParams] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { bets: true },
    }),
    getLineParams(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Players</h1>
      <p className="-mt-4 text-xs text-neutral-500">
        Only you can see this page. Each row shows individual rating · doubles rating · team # (rank of 30).
      </p>

      <ul className="flex flex-col gap-2">
        {players.map((p) => {
          const settled = p.bets.filter((b) => b.outcome !== "PENDING");
          const wins = settled.filter((b) => b.outcome === "WIN").length;
          const losses = settled.filter((b) => b.outcome === "LOSS").length;
          const pushes = settled.filter((b) => b.outcome === "PUSH").length;
          const ind = formatRating(p.individualRating);
          const dbl = formatRating(p.doublesRating);
          return (
            <li key={p.id}>
              <Link
                href={`/players/${p.id}`}
                className="flex items-center justify-between rounded border border-neutral-200 bg-white p-3 hover:border-court-green"
              >
                <span>
                  {p.name}
                  <span className="ml-2 text-xs text-neutral-500">
                    {wins}-{losses}-{pushes}
                  </span>
                  {ind && (
                    <span className="ml-2 text-xs text-neutral-500">
                      {ind} · {dbl ?? "—"}
                      {p.teamNumber !== null && ` · T${p.teamNumber}${p.teamRank !== null ? ` (#${p.teamRank})` : ""}`}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm">{p.balance} pts</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <ImportRosterPanel />
        <LineSettingsForm scale={lineParams.scale} exponent={lineParams.exponent} />
        <InvitePlayerForm />
        <ImportPlayersForm />
        <ReconcileBalancesButton />
        <ResetBalancesButton />
      </div>
    </div>
  );
}
