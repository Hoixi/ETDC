import { NextResponse } from "next/server";
import { checkManageGuild } from "@/lib/guard";
import { botApi } from "@/lib/botApi";

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  return NextResponse.json(await botApi.safe.channels(params.guildId));
}
