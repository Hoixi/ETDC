// Sihirli giriş: ?token doğrula → arena cookie set et → karaktere yönlendir.
import { NextResponse } from "next/server";
import { verifyMagicToken, makeArenaCookie, ARENA_COOKIE, cookieOptions } from "@/lib/arenaAuth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? undefined;
  const v = verifyMagicToken(token);
  if (!v) {
    return NextResponse.redirect(new URL("/arena/hata", req.url));
  }
  const res = NextResponse.redirect(new URL(`/arena/${v.g}`, req.url));
  res.cookies.set(ARENA_COOKIE, makeArenaCookie(v.d, v.g, v.n), cookieOptions);
  return res;
}
