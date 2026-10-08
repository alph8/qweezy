import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: fix a player's name/email — e.g. if the email imported from
// a spreadsheet isn't the one they actually want to sign in with.
export const PATCH = withAuthError(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const { name, email } = (await req.json()) as { name?: string; email?: string };

  const data: { name?: string; email?: string } = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof email === "string" && email.trim()) data.email = email.trim().toLowerCase();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const player = await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json(player);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Another player already uses that email" }, { status: 400 });
    }
    throw err;
  }
});
