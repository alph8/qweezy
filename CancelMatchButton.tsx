"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only. For a match that's already live: returns every pending bet's
// points to the bettor, then removes the match.
export default function CancelMatchButton({ matchId, betCount }: { matchId: string; betCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={busy}
        onClick={async () => {
          const msg =
            betCount > 0
              ? `Cancel this match and refund ${betCount} bet${betCount === 1 ? "" : "s"}? The points go back to each bettor and the match is deleted. This can't be undone.`
              : "Cancel and delete this match? This can't be undone.";
          if (!window.confirm(msg)) return;
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/matches/${matchId}/cancel`, { method: "POST" });
          setBusy(false);
          if (!res.ok) {
            setError((await res.json()).error || "Something went wrong");
            return;
          }
          router.push("/matches");
          router.refresh();
        }}
        className="self-start rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
      >
        Cancel match &amp; refund bets
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
