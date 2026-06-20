import { NextResponse } from "next/server";
import { checkManageGuild } from "@/lib/guard";
import { botApi, BotApiError } from "@/lib/botApi";

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  return NextResponse.json(await botApi.safe.roles(params.guildId));
}

// Panelden "yeni rol oluştur".
export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; color?: string };
  if (!body.name) return NextResponse.json({ error: "Rol adı gerekli" }, { status: 400 });
  try {
    const role = await botApi.createRole(params.guildId, body.name, body.color);
    return NextResponse.json(role);
  } catch (err) {
    const status = err instanceof BotApiError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
