import { NextResponse } from "next/server";
import { prisma } from "@hoixi/db";
import { checkManageGuild } from "@/lib/guard";
import { botApi, BotApiError } from "@/lib/botApi";

export async function POST(
  _req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const panel = await prisma.rolePanel.findUnique({
    where: { id: params.panelId },
    select: { guildId: true },
  });
  if (panel?.guildId !== params.guildId) {
    return NextResponse.json({ error: "Panel bulunamadı" }, { status: 404 });
  }
  try {
    const result = await botApi.publishPanel(params.panelId);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof BotApiError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof BotApiError ? err.message : "Bot ile iletişim kurulamadı (bot çalışıyor mu?)" },
      { status },
    );
  }
}
