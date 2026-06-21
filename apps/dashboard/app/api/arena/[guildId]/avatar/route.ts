// Karakter avatar seçimini kaydet (kozmetik; manifest'e göre doğrulanır).
import { NextResponse } from "next/server";
import { prisma } from "@hoixi/db";
import { getArenaIdentity } from "@/lib/arenaAuth";
import { isValidSelection } from "@/lib/avatar";

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);
  if (!id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { avatar } = (await req.json()) as { avatar?: unknown };
  if (!isValidSelection(avatar)) {
    return NextResponse.json({ error: "Geçersiz avatar seçimi" }, { status: 400 });
  }

  await prisma.arenaPlayer.upsert({
    where: { guildId_userId: { guildId: params.guildId, userId: id.discordId } },
    update: { avatar: avatar as object },
    create: {
      userId: id.discordId,
      avatar: avatar as object,
      guild: { connectOrCreate: { where: { id: params.guildId }, create: { id: params.guildId } } },
    },
  });

  return NextResponse.json({ ok: true });
}
