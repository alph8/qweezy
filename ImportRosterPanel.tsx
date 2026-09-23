"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Report = {
  dryRun: boolean;
  matched: string[];
  toCreate: string[];
  created: string[];
  ambiguous: string[];
  notInRoster: string[];
  rosterSize: number;
};

// Admin-only. Two steps so nothing surprising happens: Preview shows who would
// be updated and who isn't in the app yet; Apply writes the ratings.
export default function ImportRosterPanel() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState<null | "preview" | "apply">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    setBusy(dryRun ? "preview" : "apply");
    setError(null);
    setDone(null);
    const res = await fetch("/api/admin/import-roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun, createMissing }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json()).error || "Something went wrong");
      return;
    }
    const data: Report = await res.json();
    if (dryRun) {
      setReport(data);
    } else {
      setReport(null);
      setDone(
        `Done: ratings set for ${data.matched.length} existing player(s)` +
          (data.created.length ? ` and ${data.created.length} new player(s) added.` : ".")
      );
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-dashed border-neutral-300 p-3">
      <h3 className="text-sm font-semibold">Load ratings &amp; teams from the spreadsheet</h3>
      <p className="text-xs text-neutral-500">
        Fills in each player's individual (NTRP) rating, doubles rating, team # and team ranking for the
        30 teams. Names are matched to the players already here (ignoring capitalization); safe to run again.
      </p>

      <button
        onClick={() => run(true)}
        disabled={busy !== null}
        className="self-start rounded border border-neutral-400 px-3 py-1 text-sm font-medium disabled:opacity-50"
      >
        {busy === "preview" ? "Checking…" : "Preview"}
      </button>

      {report && (
        <div className="flex flex-col gap-2 rounded bg-neutral-50 p-2 text-xs">
          <p>
            <b>{report.matched.length}</b> of {report.rosterSize} names match a player already here — their ratings
            will be filled in.
          </p>
          {report.toCreate.length > 0 && (
            <div>
              <p>
                <b>{report.toCreate.length}</b> aren't in the app yet:
              </p>
              <p className="text-neutral-600">{report.toCreate.join(", ")}</p>
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createMissing}
                  onChange={(e) => setCreateMissing(e.target.checked)}
                />
                Add them as new players (placeholder email — set their real one later with “Edit name / email”)
              </label>
            </div>
          )}
          {report.ambiguous.length > 0 && (
            <p className="text-red-700">
              Skipped (two players share this name — rename one first): {report.ambiguous.join(", ")}
            </p>
          )}
          {report.notInRoster.length > 0 && (
            <div>
              <p>In the app but not on the spreadsheet (check for a spelling/nickname difference):</p>
              <p className="text-neutral-600">{report.notInRoster.join(", ")}</p>
            </div>
          )}
          <button
            onClick={() => run(false)}
            disabled={busy !== null}
            className="self-start rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "apply"
              ? "Applying…"
              : `Apply${createMissing && report.toCreate.length ? ` (update ${report.matched.length}, add ${report.toCreate.length})` : ` (update ${report.matched.length})`}`}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && <p className="text-xs text-court-green">{done}</p>}
    </div>
  );
}
