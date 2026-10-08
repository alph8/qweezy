import { prisma } from "./prisma";
import { DEFAULT_LINE_PARAMS, LineParams } from "./lines";

const SCALE_KEY = "line.scale";
const EXPONENT_KEY = "line.exponent";

// Server-only: the admin-tunable ratings-to-line curve (falls back to the
// defaults until Eric changes it).
export async function getLineParams(): Promise<LineParams> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [SCALE_KEY, EXPONENT_KEY] } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    scale: byKey.get(SCALE_KEY) ?? DEFAULT_LINE_PARAMS.scale,
    exponent: byKey.get(EXPONENT_KEY) ?? DEFAULT_LINE_PARAMS.exponent,
  };
}

export async function saveLineParams(params: LineParams): Promise<void> {
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: SCALE_KEY }, update: { value: params.scale }, create: { key: SCALE_KEY, value: params.scale } }),
    prisma.setting.upsert({ where: { key: EXPONENT_KEY }, update: { value: params.exponent }, create: { key: EXPONENT_KEY, value: params.exponent } }),
  ]);
}
