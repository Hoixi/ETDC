// Oyuncu ekonomi aksiyonları → bot iç API'sine proxy (arena cookie ile kimlik).
import { NextResponse } from "next/server";
import { getArenaIdentity } from "@/lib/arenaAuth";
import { botApi, BotApiError } from "@/lib/botApi";

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);
  if (!id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { action, itemId, rarities } = (await req.json()) as { action?: string; itemId?: string; rarities?: string[] };
  const g = params.guildId;
  const u = id.discordId;

  try {
    switch (action) {
      case "salvage":
        return NextResponse.json(await botApi.arenaSalvage(g, u, itemId!));
      case "salvageBulk":
        return NextResponse.json(await botApi.arenaSalvageBulk(g, u, rarities ?? []));
      case "upgrade":
        return NextResponse.json(await botApi.arenaUpgrade(g, u, itemId!));
      case "reroll":
        return NextResponse.json(await botApi.arenaReroll(g, u, itemId!));
      case "wheel":
        return NextResponse.json(await botApi.arenaWheel(g, u));
      default:
        return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }
  } catch (err) {
    const status = err instanceof BotApiError ? err.status : 502;
    const msg = err instanceof BotApiError ? err.message : "Bot ile iletişim kurulamadı";
    return NextResponse.json({ error: msg }, { status });
  }
}
