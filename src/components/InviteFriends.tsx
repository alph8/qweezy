"use client";
import { useState } from "react";

// Signed-in players get a one-tap way to send friends the site. Uses the phone's
// share sheet when there is one, otherwise copies the message to the clipboard.
export default function InviteFriends() {
  const [status, setStatus] = useState<string | null>(null);

  async function invite() {
    const url = window.location.origin;
    const text = `Join me on Qweezy, our club's doubles tennis prediction game. Everyone gets 1,000 points a week to wager on the matches, and it's points only. Sign in with your email here: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on Qweezy", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus("Invite message copied. Paste it into a text or email.");
    } catch {
      // Share sheet dismissed, or clipboard blocked: show the text so it can be copied by hand.
      setStatus(text);
    }
  }

  return (
    <section className="rounded border border-dashed border-neutral-300 p-3">
      <h2 className="text-sm font-semibold">Invite a friend</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Send friends the link. They sign in with their email and start with 1,000 points.
      </p>
      <button
        onClick={invite}
        className="mt-2 rounded bg-court-green px-3 py-1.5 text-sm font-medium text-white"
      >
        Share invite
      </button>
      {status && <p className="mt-2 break-words text-xs text-neutral-600">{status}</p>}
    </section>
  );
}
