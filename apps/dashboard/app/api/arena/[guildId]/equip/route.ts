import { NextResponse } from "next/server";
import { prisma } from "@hoixi/db";
import { getArenaIdentity } from "@/lib/arenaAuth";

// Body: { itemId, action: "equip" | "unequip" }
export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);
  if (!id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { itemId, action } = (await req.json()) as { itemId?: string; action?: string };
  if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

  const item = await prisma.arenaItem.findUnique({ where: { id: itemId } });
  if (!item || item.guildId !== params.guildId || item.userId !== id.discordId) {
    return NextResponse.json({ error: "Eşya bulunamadı" }, { status: 404 });
  }

  if (action === "unequip") {
    await prisma.arenaItem.update({ where: { id: itemId }, data: { equipped: false } });
    return NextResponse.json({ ok: true });
  }

  // Yüzük 2 slota giyilebilir, diğer slotlar tek. Kapasite dolu ise en eski giyili olanı çıkar.
  const max = item.slot === "RING" ? 2 : 1;
  const equipped = await prisma.arenaItem.findMany({
    where: { guildId: params.guildId, userId: id.discordId, slot: item.slot, equipped: true },
    orderBy: { createdAt: "asc" },
  });
  const others = equipped.filter((x) => x.id !== itemId);
  // Yeni eşya için yer aç: max-1 kadar yer kalacak şekilde en eskileri çıkar.
  const toRemove = others.slice(0, Math.max(0, others.length - (max - 1)));

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.arenaItem.updateMany({ where: { id: { in: toRemove.map((x) => x.id) } }, data: { equipped: false } })]
      : []),
    prisma.arenaItem.update({ where: { id: itemId }, data: { equipped: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
