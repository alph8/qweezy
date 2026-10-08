"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvitePlayerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        setBusy(false);
        if (!res.ok) {
          setError((await res.json()).error || "Something went wrong");
          return;
        }
        setName("");
        router.refresh();
      }}
      className="flex flex-col gap-2 rounded border border-dashed border-neutral-300 p-3"
    >
      <h3 className="text-sm font-semibold">Add a player to the roster</h3>
      <div className="flex gap-2">
        <input
          placeholder="Name or nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <button
          disabled={busy}
          className="rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
