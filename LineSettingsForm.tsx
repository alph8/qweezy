"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lineMagnitudeForGap } from "@/lib/lines";

// Admin-only. Tunes how team-rating gaps turn into a suggested line. You still
// confirm or change the line on every match.
export default function LineSettingsForm({ scale, exponent }: { scale: number; exponent: number }) {
  const router = useRouter();
  const [s, setS] = useState(String(scale));
  const [x, setX] = useState(String(exponent));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sn = parseFloat(s);
  const xn = parseFloat(x);
  const valid = Number.isFinite(sn) && sn > 0 && sn <= 50 && Number.isFinite(xn) && xn >= 0.1 && xn <= 2;

  const preview = useMemo(
    () =>
      valid
        ? [0.1, 0.3, 0.5, 1, 1.5, 2].map((g) => ({ gap: g, line: lineMagnitudeForGap(g, { scale: sn, exponent: xn }) }))
        : [],
    [valid, sn, xn]
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/admin/line-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scale: sn, exponent: xn }),
        });
        setBusy(false);
        if (!res.ok) {
          setMsg({ ok: false, text: (await res.json()).error || "Something went wrong" });
          return;
        }
        setMsg({ ok: true, text: "Saved." });
        router.refresh();
      }}
      className="flex flex-col gap-2 rounded border border-dashed border-neutral-300 p-3"
    >
      <h3 className="text-sm font-semibold">Ratings → line curve</h3>
      <p className="text-xs text-neutral-500">
        Suggested line = scale × (team-rating gap)<sup>exponent</sup>, rounded to the nearest 0.5. A bigger
        scale means bigger lines; a smaller exponent makes small gaps count for more and big gaps flatten out.
      </p>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col text-xs text-neutral-600">
          Scale
          <input
            value={s}
            onChange={(e) => setS(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs text-neutral-600">
          Exponent
          <input
            value={x}
            onChange={(e) => setX(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          disabled={busy || !valid}
          className="rounded bg-court-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {preview.length > 0 && (
        <p className="text-xs text-neutral-600">
          Rating gap → line:{" "}
          {preview.map((p) => `${p.gap} → ${p.line}`).join("  ·  ")}
        </p>
      )}
      {msg && <p className={`text-xs ${msg.ok ? "text-court-green" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
