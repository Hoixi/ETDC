// Skill tree aksiyonları → bot iç API'sine proxy (arena cookie ile kimlik).
import { NextResponse } from "next/server";
import { getArenaIdentity } from "@/lib/arenaAuth";
import { botApi, BotApiError } from "@/lib/botApi";

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);
  if (!id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { action, nodeId } = (await req.json()) as { action?: string; nodeId?: string };
  const g = params.guildId;
  const u = id.discordId;

  try {
    switch (action) {
      case "allocate":
        return NextResponse.json(await botApi.arenaSkillAllocate(g, u, nodeId!));
      case "respec":
        return NextResponse.json(await botApi.arenaSkillRespec(g, u));
      default:
        return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }
  } catch (err) {
    const status = err instanceof BotApiError ? err.status : 502;
    const msg = err instanceof BotApiError ? err.message : "Bot ile iletişim kurulamadı";
    return NextResponse.json({ error: msg }, { status });
  }
}
