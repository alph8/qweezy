"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReconcileBalancesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 rounded border border-dashed border-neutral-300 p-3">
      <h3 className="text-sm font-semibold">Fix balances (one-time)</h3>
      <p className="text-xs text-neutral-500">
        Bets placed before pending wagers started reducing your balance immediately are still
        showing the old, un-adjusted balance. This recalculates everyone's balance from their bet
        history (starting balance, minus points currently at risk, plus/minus settled results) and
        fixes anyone who's off. Safe to run more than once — it's a no-op once balances are correct.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const res = await fetch("/api/admin/reconcile-balances", { method: "POST" });
          setBusy(false);
          if (!res.ok) {
            setMessage("Something went wrong.");
            return;
          }
          const data = await res.json();
          setMessage(
            data.playersFixed.length === 0
              ? "Checked everyone — balances were already correct."
              : `Fixed ${data.playersFixed.length} player(s): ${data.playersFixed
                  .map((p: any) => `${p.name} ${p.from}→${p.to}`)
                  .join(", ")}`
          );
          router.refresh();
        }}
        className="self-start rounded border border-neutral-400 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        Recalculate balances
      </button>
      {message && <p className="text-xs text-court-green">{message}</p>}
    </div>
  );
}
