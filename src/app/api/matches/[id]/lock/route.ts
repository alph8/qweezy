import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, withAuthError } from "@/lib/session";

// Admin-only: manually close betting on a match, e.g. right before it starts.
export const POST = withAuthError(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const existing = await prisma.match.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (existing.status !== "OPEN") {
    return NextResponse.json({ error: "Only a match that's open for betting can be locked" }, { status: 400 });
  }
  const match = await prisma.match.update({
    where: { id: params.id },
    data: { status: "LOCKED" },
  });
  return NextResponse.json(match);
});
