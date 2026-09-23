"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditPlayerForm({
  playerId,
  currentName,
  currentEmail,
}: {
  playerId: string;
  currentName: string;
  currentEmail: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-xs text-court-green underline"
      >
        Edit name / email
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/players/${playerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });
        setBusy(false);
        if (!res.ok) {
          setError((await res.json()).error || "Something went wrong");
          return;
        }
        setOpen(false);
        router.refresh();
      }}
      className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3"
    >
      <label className="text-xs font-medium text-neutral-600">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="rounded border border-neutral-300 px-2 py-1 text-sm"
      />
      <label className="text-xs font-medium text-neutral-600">
        Email (the address they sign in with)
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="rounded border border-neutral-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-300 px-3 py-1 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
