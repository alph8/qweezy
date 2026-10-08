"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SetRow = { teamAGames: string; teamBGames: string; isTiebreak: boolean; isMatchTiebreak: boolean };

const emptySet = (): SetRow => ({ teamAGames: "", teamBGames: "", isTiebreak: false, isMatchTiebreak: false });

export default function ResultForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([emptySet(), emptySet(), emptySet()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(i: number, patch: Partial<SetRow>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);

        const payload = sets
          .map((s, i) => ({ order: i + 1, ...s }))
          .filter((s) => s.teamAGames !== "" && s.teamBGames !== "")
          .map((s) => ({
            order: s.order,
            teamAGames: parseInt(s.teamAGames, 10),
            teamBGames: parseInt(s.teamBGames, 10),
            isTiebreak: s.isTiebreak,
            isMatchTiebreak: s.isMatchTiebreak,
          }));

        const res = await fetch(`/api/matches/${matchId}/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sets: payload }),
        });
        setBusy(false);
        if (!res.ok) {
          setError((await res.json()).error || "Something went wrong");
          return;
        }
        router.refresh();
      }}
      className="flex flex-col gap-3 rounded border border-neutral-200 bg-white p-3"
    >
      <h3 className="text-sm font-semibold">Enter final score</h3>
      {sets.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-12 text-neutral-500">Set {i + 1}</span>
          <input
            type="number"
            placeholder="A"
            value={s.teamAGames}
            onChange={(e) => updateSet(i, { teamAGames: e.target.value })}
            className="w-14 rounded border border-neutral-300 px-2 py-1"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="B"
            value={s.teamBGames}
            onChange={(e) => updateSet(i, { teamBGames: e.target.value })}
            className="w-14 rounded border border-neutral-300 px-2 py-1"
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={s.isTiebreak}
              onChange={(e) => updateSet(i, { isTiebreak: e.target.checked, isMatchTiebreak: false })}
            />
            tiebreak (1.5)
          </label>
          {i === 2 && (
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={s.isMatchTiebreak}
                onChange={(e) => updateSet(i, { isMatchTiebreak: e.target.checked, isTiebreak: false })}
              />
              match tiebreak (2.5)
            </label>
          )}
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="self-start rounded bg-court-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Submit result & settle bets
      </button>
    </form>
  );
}
