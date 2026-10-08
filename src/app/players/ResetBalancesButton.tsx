"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetBalancesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 rounded border border-dashed border-neutral-300 p-3">
      <h3 className="text-sm font-semibold">Reset everyone's balance</h3>
      <p className="text-xs text-neutral-500">
        Sets every player's balance back to 1,000 points. Match and bet history is kept — this
        just clears the scoreboard, e.g. to wipe out test bets before real players start.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          if (!confirm("Reset every player's balance to 1,000 points? This can't be undone.")) return;
          setBusy(true);
          setMessage(null);
          const res = await fetch("/api/admin/reset-balances", { method: "POST" });
          setBusy(false);
          if (!res.ok) {
            setMessage("Something went wrong.");
            return;
          }
          const data = await res.json();
          setMessage(`Reset ${data.playersReset} player balance(s) to 1,000.`);
          router.refresh();
        }}
        className="self-start rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
      >
        Reset all balances to 1,000
      </button>
      {message && <p className="text-xs text-court-green">{message}</p>}
    </div>
  );
}
