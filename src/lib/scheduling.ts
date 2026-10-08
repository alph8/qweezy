// Matches are always played Thursdays at 7:00 PM Central time (Eric's
// club night). This module computes that default and treats it as the
// betting cutoff: once a match's scheduledAt passes, betting is treated
// as closed even if Eric hasn't manually clicked "Lock" yet.

const CENTRAL_TZ = "America/Chicago";

// Returns the UTC offset (in minutes, negative = behind UTC) that
// America/Chicago is at the given instant. Handles CST/CDT automatically.
function centralOffsetMinutes(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

// The next Thursday (today counts) at 7:00 PM Central time, as a real Date.
export function nextThursday7pmCentral(from: Date = new Date()): Date {
  const anchor = new Date(from);
  anchor.setUTCHours(12, 0, 0, 0); // noon UTC, safely mid-day everywhere
  const day = anchor.getUTCDay(); // Sun=0 .. Thu=4 .. Sat=6
  const daysUntilThursday = (4 - day + 7) % 7;
  const thursdayMidnightUTC = new Date(anchor);
  thursdayMidnightUTC.setUTCDate(anchor.getUTCDate() + daysUntilThursday);
  thursdayMidnightUTC.setUTCHours(0, 0, 0, 0);

  const offset = centralOffsetMinutes(thursdayMidnightUTC);
  // 7:00 PM Central, expressed as minutes-from-midnight in UTC.
  const utcMinutesFromMidnight = 19 * 60 - offset;
  return new Date(thursdayMidnightUTC.getTime() + utcMinutesFromMidnight * 60000);
}

// Formats a Date as a Central-time wall-clock string suitable for an
// <input type="datetime-local"> value, e.g. "2026-09-24T19:00".
export function toCentralDatetimeLocalValue(date: Date): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

// Interprets a "YYYY-MM-DDTHH:mm" string as Central *wall-clock* time
// (not the browser's own timezone) and returns the corresponding Date.
export function centralWallClockToDate(wallClock: string): Date {
  const [datePart, timePart] = wallClock.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = (timePart || "00:00").split(":").map(Number);
  const naiveUTC = Date.UTC(y, m - 1, d, hh, mm);
  const offset = centralOffsetMinutes(new Date(naiveUTC));
  return new Date(naiveUTC - offset * 60000);
}

// A match's betting cutoff has passed once its scheduledAt time arrives,
// even if an admin hasn't manually locked it yet.
export function isBettingCutoffPassed(match: { scheduledAt: Date | string | null }): boolean {
  if (!match.scheduledAt) return false;
  return new Date(match.scheduledAt).getTime() <= Date.now();
}

// A match is really open for new bets only while it's marked OPEN *and*
// its scheduled cutoff (if any) hasn't passed.
export function isEffectivelyOpen(match: { status: string; scheduledAt: Date | string | null }): boolean {
  return match.status === "OPEN" && !isBettingCutoffPassed(match);
}

// Status label that reflects the cutoff even before an admin clicks Lock.
export function effectiveStatus(match: { status: string; scheduledAt: Date | string | null }): string {
  if (match.status === "OPEN" && isBettingCutoffPassed(match)) return "LOCKED";
  return match.status;
}
