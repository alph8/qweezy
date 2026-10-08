"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TeamPicker from "@/components/TeamPicker";
import { centralWallClockToDate } from "@/lib/scheduling";
import {
  LineParams,
  isValidLine,
  splitLine,
  suggestLine,
  toSignedLine,
} from "@/lib/lines";

type PlayerOpt = {
  id: string;
  name: string;
  individualRating: number | null;
  doublesRating: number | null;
};

const fmtLine = (line: number) => (line > 0 ? `+${line}` : `${line}`);

// Admin-only. Everything you can do to a match BEFORE it goes live: change the
// teams or cutoff time, review the ratings-based suggested line and set your
// own, then publish (or delete the draft). Publishing locks the match.
export default function DraftPanel({
  matchId,
  players,
  initialTeamA,
  initialTeamB,
  initialScheduledAt,
  initialLine,
  params,
}: {
  matchId: string;
  players: PlayerOpt[];
  initialTeamA: string[];
  initialTeamB: string[];
  initialScheduledAt: string;
  initialLine: number | null;
  params: LineParams;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is PlayerOpt => !!p);

  const [teamA, setTeamA] = useState<string[]>([initialTeamA[0] ?? "", initialTeamA[1] ?? ""]);
  const [teamB, setTeamB] = useState<string[]>([initialTeamB[0] ?? "", initialTeamB[1] ?? ""]);
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);

  const suggestion = useMemo(
    () => suggestLine(pick(teamA.filter(Boolean)), pick(teamB.filter(Boolean)), params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamA, teamB, params, byId]
  );

  // Start from the saved line if there is one, otherwise from the suggestion.
  const start =
    initialLine !== null
      ? splitLine(initialLine)
      : suggestion
      ? { favorite: suggestion.favorite, magnitude: suggestion.magnitude }
      : { favorite: null, magnitude: 0 };
  const [favorite, setFavorite] = useState<"A" | "B">(start.favorite ?? "A");
  const [magnitude, setMagnitude] = useState(String(start.magnitude));

  const magnitudeNum = parseFloat(magnitude);
  const lineForTeamA = toSignedLine(favorite, Number.isFinite(magnitudeNum) ? magnitudeNum : 0);
  const lineOk = isValidLine(lineForTeamA) && Number.isFinite(magnitudeNum) && magnitudeNum >= 0;

  const [busy, setBusy] = useState<null | "save" | "publish" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function applySuggestion() {
    if (!suggestion) return;
    setFavorite(suggestion.favorite ?? "A");
    setMagnitude(String(suggestion.magnitude));
  }

  async function save(): Promise<boolean> {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamA: teamA.filter(Boolean),
        teamB: teamB.filter(Boolean),
        scheduledAt: scheduledAt ? centralWallClockToDate(scheduledAt).toISOString() : null,
        lineForTeamA: lineOk ? lineForTeamA : null,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error || "Something went wrong");
      return false;
    }
    return true;
  }

  const lineText =
    magnitudeNum === 0
      ? "Even (pick'em) — line 0"
      : `Team ${favorite} favored by ${magnitudeNum} (Team A ${fmtLine(lineForTeamA)})`;

  return (
    <section className="flex flex-col gap-4 rounded border-2 border-dashed border-court-clay bg-amber-50/40 p-4">
      <div>
        <h2 className="text-lg font-semibold">Draft — only you can see this</h2>
        <p className="text-xs text-neutral-600">
          Edit anything below, then publish to open betting. Once it's published the match is locked.
        </p>
      </div>

      <TeamPicker label="Team A" players={players} value={teamA} onChange={(v) => { setTeamA(v); setSaved(false); }} />
      <TeamPicker label="Team B" players={players} value={teamB} onChange={(v) => { setTeamB(v); setSaved(false); }} />

      <div>
        <label className="text-sm font-medium">Cutoff time (Central)</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => { setScheduledAt(e.target.value); setSaved(false); }}
          className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <p className="mt-1 text-xs text-neutral-500">Betting closes automatically at this time. Clear it to lock manually only.</p>
      </div>

      <div className="rounded border border-neutral-200 bg-white p-3">
        <h3 className="text-sm font-semibold">Ratings-based line</h3>
        {suggestion ? (
          <div className="mt-1 flex flex-col gap-1 text-sm">
            <p className="text-neutral-700">
              Team ratings (doubles): <b>A {suggestion.ratingA.toFixed(2)}</b> · <b>B {suggestion.ratingB.toFixed(2)}</b> · gap{" "}
              {suggestion.gap.toFixed(2)}
            </p>
            <p>
              Suggested:{" "}
              <b>
                {suggestion.favorite
                  ? `Team ${suggestion.favorite} favored by ${suggestion.magnitude}`
                  : "even (pick'em)"}
              </b>
            </p>
            <button
              type="button"
              onClick={applySuggestion}
              className="self-start rounded border border-court-green px-2 py-1 text-xs font-medium text-court-green"
            >
              Use suggestion
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-neutral-500">
            Pick all the players (with ratings) to see a suggested line — or just set the line yourself below.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3">
        <label className="text-sm font-semibold">Your line</label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={favorite}
            onChange={(e) => { setFavorite(e.target.value as "A" | "B"); setSaved(false); }}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            <option value="A">Team A favored</option>
            <option value="B">Team B favored</option>
          </select>
          <span>by</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={magnitude}
            onChange={(e) => { setMagnitude(e.target.value); setSaved(false); }}
            className="w-24 rounded border border-neutral-300 px-2 py-1"
          />
          <span className="text-neutral-500">points (0, 0.5, 1, 1.5 …)</span>
        </div>
        <p className={`text-xs ${lineOk ? "text-neutral-600" : "text-red-600"}`}>
          {lineOk ? lineText : "Enter a line in steps of 0.5, starting at 0."}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-court-green">Draft saved.</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("save");
            setError(null);
            const ok = await save();
            setBusy(null);
            if (ok) {
              setSaved(true);
              router.refresh();
            }
          }}
          className="rounded border border-neutral-400 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Save draft
        </button>

        <button
          type="button"
          disabled={busy !== null || !lineOk}
          onClick={async () => {
            if (
              !window.confirm(
                `Publish this match and open betting?\n\n${lineText}\n\nOnce it's published, the teams and line can't be changed.`
              )
            )
              return;
            setBusy("publish");
            setError(null);
            if (!(await save())) {
              setBusy(null);
              return;
            }
            const res = await fetch(`/api/matches/${matchId}/spread`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lineForTeamA }),
            });
            setBusy(null);
            if (!res.ok) {
              setError((await res.json()).error || "Something went wrong");
              return;
            }
            router.refresh();
          }}
          className="rounded bg-court-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Publish — open betting
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            if (!window.confirm("Delete this draft match? This can't be undone.")) return;
            setBusy("delete");
            setError(null);
            const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
            setBusy(null);
            if (!res.ok) {
              setError((await res.json()).error || "Something went wrong");
              return;
            }
            router.push("/matches");
            router.refresh();
          }}
          className="ml-auto rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Delete draft
        </button>
      </div>
    </section>
  );
}
