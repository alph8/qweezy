import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: add a player to the roster. Email is optional; without one a
// placeholder address is generated (the User table requires a unique email).
// If an email is supplied, that person can later sign in with it.
export const POST = withAuthError(async (req: NextRequest) => {
  await requireAdmin();
  const body = (await req.json()) as { email?: string; name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const supplied = body.email?.trim().toLowerCase();
  const email =
    supplied ||
    `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}.${Math.random()
      .toString(36)
      .slice(2, 8)}@roster.qweezy.invalid`;

  const player = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  return NextResponse.json(player);
});

// Admin-only. The player list carries emails, balances and doubles ratings,
// which nobody but the admin should see.
export const GET = withAuthError(async () => {
  await requireAdmin();
  const players = await prisma.user.findMany({
    orderBy: { balance: "desc" },
    include: {
      bets: true,
      matchEntries: { include: { match: true } },
    },
  });
  return NextResponse.json(players);
});
