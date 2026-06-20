import { NextResponse } from "next/server";
import { prisma } from "@hoixi/db";
import { checkMember } from "@/lib/guard";

// Body: { itemId, action: "equip" | "unequip" }
export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const member = await checkMember(params.guildId);
  if (!member) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { itemId, action } = (await req.json()) as { itemId?: string; action?: string };
  if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

  const item = await prisma.arenaItem.findUnique({ where: { id: itemId } });
  if (!item || item.guildId !== params.guildId || item.userId !== member.discordId) {
    return NextResponse.json({ error: "Eşya bulunamadı" }, { status: 404 });
  }

  if (action === "unequip") {
    await prisma.arenaItem.update({ where: { id: itemId }, data: { equipped: false } });
    return NextResponse.json({ ok: true });
  }

  // Equip: aynı slottaki diğer eşyayı çıkar, sonra bunu giy.
  await prisma.$transaction([
    prisma.arenaItem.updateMany({
      where: { guildId: params.guildId, userId: member.discordId, slot: item.slot, equipped: true },
      data: { equipped: false },
    }),
    prisma.arenaItem.update({ where: { id: itemId }, data: { equipped: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
