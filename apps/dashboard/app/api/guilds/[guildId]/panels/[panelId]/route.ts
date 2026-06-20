import { NextResponse } from "next/server";
import { prisma, RolePanelMode, ButtonStyle } from "@hoixi/db";
import { checkManageGuild } from "@/lib/guard";
import { botApi } from "@/lib/botApi";

interface ButtonInput {
  roleId: string;
  label: string;
  emoji?: string | null;
  style?: keyof typeof ButtonStyle;
  order: number;
}
interface PanelUpdate {
  channelId?: string;
  mode?: keyof typeof RolePanelMode;
  embed?: unknown;
  buttons?: ButtonInput[];
}

async function ownsPanel(guildId: string, panelId: string): Promise<boolean> {
  const panel = await prisma.rolePanel.findUnique({ where: { id: panelId }, select: { guildId: true } });
  return panel?.guildId === guildId;
}

export async function PUT(
  req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await checkManageGuild(params.guildId)) || !(await ownsPanel(params.guildId, params.panelId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const body = (await req.json()) as PanelUpdate;

  // Butonlar verilmişse hepsini değiştir (sil + yeniden oluştur).
  const panel = await prisma.$transaction(async (tx) => {
    if (body.buttons) {
      await tx.roleButton.deleteMany({ where: { panelId: params.panelId } });
    }
    return tx.rolePanel.update({
      where: { id: params.panelId },
      data: {
        ...(body.channelId ? { channelId: body.channelId } : {}),
        ...(body.mode ? { mode: RolePanelMode[body.mode] ?? RolePanelMode.TOGGLE } : {}),
        ...(body.embed !== undefined ? { embed: (body.embed ?? {}) as object } : {}),
        ...(body.buttons
          ? {
              buttons: {
                create: body.buttons.map((b, i) => ({
                  roleId: b.roleId,
                  label: b.label.slice(0, 80),
                  emoji: b.emoji || null,
                  style: ButtonStyle[b.style ?? "SECONDARY"] ?? ButtonStyle.SECONDARY,
                  order: b.order ?? i,
                })),
              },
            }
          : {}),
      },
      include: { buttons: { orderBy: { order: "asc" } } },
    });
  });
  return NextResponse.json(panel);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await checkManageGuild(params.guildId)) || !(await ownsPanel(params.guildId, params.panelId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  // Önce Discord mesajını sil (bot), sonra DB (bot zaten DB'den de siliyor).
  try {
    await botApi.deletePanel(params.panelId);
  } catch {
    // Bot kapalıysa en azından DB'den sil.
    await prisma.rolePanel.delete({ where: { id: params.panelId } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
