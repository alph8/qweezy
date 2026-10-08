import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: bulk-add/update players from an imported Excel file or a
// pasted spreadsheet range. Rows with no usable email are skipped.
export const POST = withAuthError(async (req: NextRequest) => {
  await requireAdmin();
  const { players } = (await req.json()) as { players: { name: string; email: string }[] };

  if (!Array.isArray(players) || players.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const row of players) {
    const email = row.email?.trim().toLowerCase();
    const name = row.name?.trim();
    if (!email || !email.includes("@") || !name) {
      skipped.push(row.email || row.name || "(blank row)");
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });
    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({ created, updated, skipped });
});
