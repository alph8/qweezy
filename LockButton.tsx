"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/matches/${matchId}/lock`, { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
      className="self-start rounded border border-neutral-400 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      Lock betting
    </button>
  );
}
