"use client";
import { playerLabel } from "@/lib/format";

export type PickerPlayer = { id: string; name: string; individualRating?: number | null };

// Two-slot doubles team selector. Admin-only screens use it; each option shows
// the player's individual rating next to their name.
export default function TeamPicker({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: PickerPlayer[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="rounded border border-neutral-200 p-3">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      {[0, 1].map((slot) => (
        <select
          key={slot}
          value={value[slot] ?? ""}
          onChange={(e) => {
            const next = [...value];
            while (next.length < 2) next.push("");
            next[slot] = e.target.value;
            onChange(next);
          }}
          className="mb-2 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="">Select player…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {playerLabel(p)}
            </option>
          ))}
        </select>
      ))}
    </fieldset>
  );
}
