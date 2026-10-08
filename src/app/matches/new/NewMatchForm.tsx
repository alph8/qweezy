"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { centralWallClockToDate } from "@/lib/scheduling";
import TeamPicker, { PickerPlayer } from "@/components/TeamPicker";

export default function NewMatchForm({
  players,
  defaultScheduledAt,
}: {
  players: PickerPlayer[];
  defaultScheduledAt: string;
}) {
  const router = useRouter();
  const [teamA, setTeamA] = useState<string[]>(["", ""]);
  const [teamB, setTeamB] = useState<string[]>(["", ""]);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamA: teamA.filter(Boolean),
            teamB: teamB.filter(Boolean),
            // The picker shows Central time; convert it to a real instant
            // before sending, regardless of the admin's own browser timezone.
            scheduledAt: scheduledAt ? centralWallClockToDate(scheduledAt).toISOString() : undefined,
          }),
        });
        setBusy(false);
        if (!res.ok) {
          setError((await res.json()).error || "Something went wrong");
          return;
        }
        const match = await res.json();
        router.push(`/matches/${match.id}`);
      }}
      className="flex flex-col gap-4"
    >
      <TeamPicker label="Team A" players={players} value={teamA} onChange={setTeamA} />
      <TeamPicker label="Team B" players={players} value={teamB} onChange={setTeamB} />

      <div>
        <label className="text-sm font-medium">Cutoff time (Central)</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Defaults to the next Thursday at 7:00 PM Central — betting closes automatically once this
          time passes. Adjust it if this match is on a different night, or clear it to lock manually only.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={busy}
        className="rounded bg-court-green px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Save as draft
      </button>
      <p className="text-xs text-neutral-500">
        The match is saved as a draft that only you can see. Next you'll review the suggested line
        and publish it when you're ready — until then you can edit or delete it.
      </p>
    </form>
  );
}
