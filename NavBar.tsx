import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function NavBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <header className="sticky top-0 z-10 bg-court-green pt-[env(safe-area-inset-top)] text-white shadow">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold tracking-tight text-lg">
          🎾 Qweezy
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          <Link href="/matches">Matches</Link>
          {user?.isAdmin && <Link href="/players">Players</Link>}
          <Link href="/leaderboard">Leaderboard</Link>
          {user && <Link href="/my-bets">My bets</Link>}
          {user ? (
            <>
              <span className="w-full text-right text-xs opacity-80 sm:w-auto">
                Signed in as {user.name || user.email}
              </span>
              <span className="rounded-full bg-white/15 px-2 py-1 text-xs">
                Balance: {user.balance} pts
              </span>
              <Link href="/api/auth/signout" className="opacity-80 hover:opacity-100">
                Sign out
              </Link>
            </>
          ) : (
            <Link href="/signin" className="opacity-90 hover:opacity-100">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
