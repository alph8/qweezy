"use client";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// When someone clicks their magic link and it fails, NextAuth redirects
// them right back to this page with ?error=<code> instead of showing
// anything itself. Without this, that failure was invisible — it just
// looked like clicking "sign in" did nothing, over and over.
function callbackErrorMessage(code: string): string {
  switch (code) {
    case "Verification":
      return "That link expired or was already used. Request a new one below.";
    case "EmailSignin":
      return "Couldn't send the sign-in email. Let Eric know if this keeps happening.";
    default:
      return "Something went wrong signing you in. Try again below, and let Eric know if it keeps happening.";
  }
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      {sent ? (
        <p className="text-sm text-neutral-600">
          Check your email for a sign-in link. If it doesn't show up in a minute, check spam, or
          come back here to try again.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const result = await signIn("email", { email, redirect: false, callbackUrl: "/" });
            setBusy(false);
            if (result?.error) {
              setError(
                "Couldn't send the sign-in email. This usually means the sending address isn't set up yet — let Eric know."
              );
              return;
            }
            setSent(true);
          }}
          className="flex flex-col gap-3"
        >
          <label className="text-sm font-medium">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded border border-neutral-300 px-3 py-2"
          />
          {callbackError && !error && (
            <p className="text-sm text-red-600">{callbackErrorMessage(callbackError)}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-court-green px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
