import { NextResponse } from "next/server";
import { prisma, RolePanelMode, ButtonStyle } from "@hoixi/db";
import { checkManageGuild } from "@/lib/guard";
import { auth } from "@/auth";

interface ButtonInput {
  roleId: string;
  label: string;
  emoji?: string | null;
  style?: keyof typeof ButtonStyle;
  order: number;
}
interface PanelInput {
  channelId: string;
  mode: keyof typeof RolePanelMode;
  embed: unknown;
  buttons: ButtonInput[];
}

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const panels = await prisma.rolePanel.findMany({
    where: { guildId: params.guildId },
    include: { buttons: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(panels);
}

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const session = await auth();
  if (!session?.accessToken || !(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const body = (await req.json()) as PanelInput;
  if (!body.channelId || !Array.isArray(body.buttons) || body.buttons.length === 0) {
    return NextResponse.json({ error: "Kanal ve en az 1 buton gerekli" }, { status: 400 });
  }
  if (body.buttons.length > 25) {
    return NextResponse.json({ error: "En fazla 25 buton" }, { status: 400 });
  }

  const panel = await prisma.rolePanel.create({
    data: {
      guild: { connectOrCreate: { where: { id: params.guildId }, create: { id: params.guildId } } },
      channelId: body.channelId,
      mode: RolePanelMode[body.mode] ?? RolePanelMode.TOGGLE,
      embed: (body.embed ?? {}) as object,
      createdBy: session.discordId ?? "panel",
      buttons: {
        create: body.buttons.map((b, i) => ({
          roleId: b.roleId,
          label: b.label.slice(0, 80),
          emoji: b.emoji || null,
          style: ButtonStyle[b.style ?? "SECONDARY"] ?? ButtonStyle.SECONDARY,
          order: b.order ?? i,
        })),
      },
    },
    include: { buttons: true },
  });
  return NextResponse.json(panel);
}
