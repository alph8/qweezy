import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, withAuthError } from "@/lib/session";
import { getLineParams, saveLineParams } from "@/lib/lineSettings";

// Admin-only: read / tune the ratings-to-line curve used to suggest a spread
// (magnitude = scale * ratingGap^exponent, rounded to the nearest 0.5).
export const GET = withAuthError(async () => {
  await requireAdmin();
  return NextResponse.json(await getLineParams());
});

export const POST = withAuthError(async (req: NextRequest) => {
  await requireAdmin();
  const { scale, exponent } = (await req.json()) as { scale: number; exponent: number };

  if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0 || scale > 50) {
    return NextResponse.json({ error: "Scale must be a number between 0 and 50" }, { status: 400 });
  }
  if (typeof exponent !== "number" || !Number.isFinite(exponent) || exponent < 0.1 || exponent > 2) {
    return NextResponse.json({ error: "Exponent must be between 0.1 and 2" }, { status: 400 });
  }

  await saveLineParams({ scale, exponent });
  return NextResponse.json({ ok: true, scale, exponent });
});
