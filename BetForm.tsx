"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BetForm({
  matchId,
  maxBet,
  teamAName,
  teamBName,
}: {
  matchId: string;
  maxBet: number;
  teamAName: string;
  teamBName: string;
}) {
  const router = useRouter();
  const [team, setTeam] = useState<"A" | "B">("A");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/bets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, teamPicked: team, amount: parseInt(amount, 10) }),
        });
        setBusy(false);
        if (!res.ok) {
          setError((await res.json()).error || "Something went wrong");
          return;
        }
        router.refresh();
      }}
      className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3"
    >
      <label className="text-sm font-semibold">Place your bet</label>
      <p className="text-xs text-neutral-500">
        Max bet is 250 points per match{maxBet < 250 ? ` (you have ${maxBet} pts left)` : ""}.
      </p>
      <div className="flex gap-2">
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value as "A" | "B")}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="A">{teamAName} (Team A)</option>
          <option value="B">{teamBName} (Team B)</option>
        </select>
        <input
          type="number"
          min={1}
          max={maxBet}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="pts"
          className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <button
          disabled={busy || maxBet <= 0}
          className="rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          Bet
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
