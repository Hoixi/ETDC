// Şifresiz arena girişi: bottan gelen HMAC token'ı doğrula, imzalı cookie ile oturum aç.
// Token bot'ta INTERNAL_API_KEY ile imzalanır; cookie panelde SESSION_SECRET ile.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getUserGuilds } from "./discord";

const API_KEY = process.env.INTERNAL_API_KEY ?? "";
const SECRET = process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
export const ARENA_COOKIE = "arena_sess";
const COOKIE_TTL_S = 30 * 24 * 60 * 60; // 30 gün

const hmac = (key: string, data: string) =>
  crypto.createHmac("sha256", key).update(data).digest("base64url");

interface Payload { d: string; g: string; n?: string; exp: number }

function verify(key: string, token: string | undefined): Payload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || hmac(key, payload) !== sig) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as Payload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

// Bottan gelen giriş token'ı (INTERNAL_API_KEY).
export function verifyMagicToken(token: string | undefined): Payload | null {
  return verify(API_KEY, token);
}

// Panel oturum cookie'si (SESSION_SECRET).
export function makeArenaCookie(discordId: string, guildId: string, name?: string): string {
  const payload = Buffer.from(
    JSON.stringify({ d: discordId, g: guildId, n: name, exp: Date.now() + COOKIE_TTL_S * 1000 }),
  ).toString("base64url");
  return `${payload}.${hmac(SECRET, payload)}`;
}

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_TTL_S,
};

function readCookieValue(): string | undefined {
  try {
    return cookies().get(ARENA_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

// Arena cookie'sini guild kısıtı olmadan oku (picker yönlendirmesi için).
export function readArenaSession(): { discordId: string; guildId: string; name?: string } | null {
  const c = verify(SECRET, readCookieValue());
  return c ? { discordId: c.d, guildId: c.g, name: c.n } : null;
}

// Kimlik: önce arena cookie (bu guild), sonra Discord OAuth üyeliği.
export async function getArenaIdentity(
  guildId: string,
): Promise<{ discordId: string; name?: string } | null> {
  const c = verify(SECRET, readCookieValue());
  if (c && c.g === guildId) return { discordId: c.d, name: c.n };

  const session = await auth();
  if (session?.accessToken && session.discordId) {
    const guilds = await getUserGuilds(session.accessToken);
    if (guilds.some((g) => g.id === guildId)) {
      return { discordId: session.discordId, name: session.user?.name ?? undefined };
    }
  }
  return null;
}
