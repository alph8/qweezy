"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { name: string; email: string };

function findColumnIndexes(header: string[]) {
  const norm = header.map((h) => (h || "").toString().trim().toLowerCase());
  let nameIdx = norm.findIndex((h) => h.includes("name"));
  let emailIdx = norm.findIndex((h) => h.includes("email"));
  return { nameIdx, emailIdx };
}

function rowsFromGrid(grid: string[][]): Row[] {
  if (grid.length === 0) return [];
  const { nameIdx, emailIdx } = findColumnIndexes(grid[0]);
  const hasHeader = nameIdx !== -1 && emailIdx !== -1;
  const dataRows = hasHeader ? grid.slice(1) : grid;
  const ni = hasHeader ? nameIdx : 0;
  const ei = hasHeader ? emailIdx : 1;
  return dataRows
    .map((r) => ({ name: (r[ni] || "").toString().trim(), email: (r[ei] || "").toString().trim() }))
    .filter((r) => r.name || r.email);
}

function parsePasted(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const grid = lines.map((l) => (l.includes("\t") ? l.split("\t") : l.split(",")));
  return rowsFromGrid(grid);
}

export default function ImportPlayersForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: string[] } | null>(
    null
  );

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false }) as unknown as string[][];
      setRows(rowsFromGrid(grid));
    } catch (err) {
      setError("Couldn't read that file. Try an .xlsx/.xls/.csv export, or paste the rows instead.");
    }
  }

  function handlePasteChange(text: string) {
    setPasted(text);
    setResult(null);
    setRows(parsePasted(text));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/players/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: rows }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error || "Something went wrong");
      return;
    }
    setResult(await res.json());
    setRows([]);
    setPasted("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-dashed border-neutral-300 p-3">
      <h3 className="text-sm font-semibold">Import players</h3>
      <p className="text-xs text-neutral-500">
        Upload an Excel (.xlsx/.xls) or CSV export, or copy a Name/Email range straight out of Google
        Sheets and paste it below. A header row is optional — if there isn't one, the first column is
        used as the name and the second as the email.
      </p>

      <div>
        <label className="text-xs font-medium text-neutral-600">Upload a file</label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="mt-1 block w-full text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-600">…or paste rows (from Google Sheets, etc.)</label>
        <textarea
          value={pasted}
          onChange={(e) => handlePasteChange(e.target.value)}
          placeholder={"Name\tEmail\nJane Smith\tjane@example.com"}
          rows={4}
          className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
        />
      </div>

      {rows.length > 0 && (
        <div className="rounded bg-neutral-50 p-2 text-xs">
          <p className="mb-1 font-medium">{rows.length} row(s) ready to import:</p>
          <ul className="max-h-32 overflow-y-auto">
            {rows.map((r, i) => (
              <li key={i}>
                {r.name || "(no name)"} — {r.email || "(no email)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <p className="text-xs text-court-green">
          Imported: {result.created} new, {result.updated} updated
          {result.skipped.length > 0 && `, skipped ${result.skipped.length} (missing name/email)`}.
        </p>
      )}

      <button
        onClick={submit}
        disabled={busy || rows.length === 0}
        className="self-start rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
      >
        Import {rows.length > 0 ? `${rows.length} player(s)` : ""}
      </button>
    </div>
  );
}
