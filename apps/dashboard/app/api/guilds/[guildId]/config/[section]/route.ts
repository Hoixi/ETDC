import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@hoixi/db";
import { checkManageGuild } from "@/lib/guard";
import { botApi } from "@/lib/botApi";
import { DEFAULTS, type ConfigSection } from "@/lib/config";

const VALID = new Set<string>(Object.keys(DEFAULTS));

export async function POST(
  req: Request,
  { params }: { params: { guildId: string; section: string } },
) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  if (!VALID.has(params.section)) {
    return NextResponse.json({ error: "Geçersiz bölüm" }, { status: 400 });
  }
  const section = params.section as ConfigSection;
  const patch = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.guild.findUnique({ where: { id: params.guildId } });
  const current = (existing?.[section] as Record<string, unknown> | null) ?? {};
  const next = { ...current, ...patch } as Prisma.InputJsonValue;

  await prisma.guild.upsert({
    where: { id: params.guildId },
    create: { id: params.guildId, [section]: next },
    update: { [section]: next },
  });

  // Bot cache'ini tazele (bot kapalıysa sessizce geç).
  await botApi.invalidateConfig(params.guildId).catch(() => {});

  return NextResponse.json({ ok: true, [section]: next });
}
