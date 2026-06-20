// Aktif yetenek + addon aksiyonları → bot iç API'sine proxy (arena cookie ile kimlik).
import { NextResponse } from "next/server";
import { getArenaIdentity } from "@/lib/arenaAuth";
import { botApi, BotApiError } from "@/lib/botApi";

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);
  if (!id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { action, key, abilityKey, addonKey } = (await req.json()) as {
    action?: string; key?: string; abilityKey?: string; addonKey?: string;
  };
  const g = params.guildId;
  const u = id.discordId;

  try {
    switch (action) {
      case "equip":
        return NextResponse.json(await botApi.arenaAbilityEquip(g, u, key!));
      case "unequip":
        return NextResponse.json(await botApi.arenaAbilityUnequip(g, u, key!));
      case "attach":
        return NextResponse.json(await botApi.arenaAbilityAttach(g, u, abilityKey!, addonKey!));
      case "detach":
        return NextResponse.json(await botApi.arenaAbilityDetach(g, u, abilityKey!, addonKey!));
      default:
        return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }
  } catch (err) {
    const status = err instanceof BotApiError ? err.status : 502;
    const msg = err instanceof BotApiError ? err.message : "Bot ile iletişim kurulamadı";
    return NextResponse.json({ error: msg }, { status });
  }
}
