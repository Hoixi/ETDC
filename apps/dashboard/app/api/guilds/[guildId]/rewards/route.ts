import { NextResponse } from "next/server";
import { prisma } from "@hoixi/db";
import { checkManageGuild } from "@/lib/guard";

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const rewards = await prisma.levelReward.findMany({
    where: { guildId: params.guildId },
    orderBy: { level: "asc" },
  });
  return NextResponse.json(rewards);
}

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const body = (await req.json()) as { level?: number; roleId?: string };
  if (!body.level || body.level < 1 || !body.roleId) {
    return NextResponse.json({ error: "Geçerli level ve rol gerekli" }, { status: 400 });
  }
  const reward = await prisma.levelReward.upsert({
    where: { guildId_level: { guildId: params.guildId, level: body.level } },
    create: { guildId: params.guildId, level: body.level, roleId: body.roleId },
    update: { roleId: body.roleId },
  });
  return NextResponse.json(reward);
}

export async function DELETE(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const level = Number(searchParams.get("level"));
  if (!level) return NextResponse.json({ error: "level gerekli" }, { status: 400 });
  await prisma.levelReward
    .delete({ where: { guildId_level: { guildId: params.guildId, level } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
