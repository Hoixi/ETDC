import { NextResponse } from "next/server";
import { checkManageGuild } from "@/lib/guard";

const BASE = process.env.BOT_API_URL ?? "http://127.0.0.1:3001";
const KEY = process.env.INTERNAL_API_KEY ?? "";

// Bot'un çizdiği welcome kartını PNG olarak döndürür (panelde canlı önizleme).
export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await checkManageGuild(params.guildId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const body = await req.json();
  try {
    const res = await fetch(`${BASE}/preview/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": KEY },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Önizleme alınamadı" }, { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, { headers: { "Content-Type": "image/png" } });
  } catch {
    return NextResponse.json({ error: "Bot çalışmıyor olabilir" }, { status: 502 });
  }
}
