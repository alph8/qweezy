import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Leaderboard</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nobody's placed a bet yet. Once wagers are in, bettors show up here — ranked by how much
          they've settled once results are in, or how much they've got riding on open matches until
          then.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                <span className="mr-2 text-neutral-400">{i + 1}.</span>
                {e.name}
              </span>
              <span className="font-mono">
                {e.hasSettled
                  ? `${e.settledNet >= 0 ? "+" : ""}${e.settledNet} pts`
                  : `Risking ${e.pendingWagered} pts`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
