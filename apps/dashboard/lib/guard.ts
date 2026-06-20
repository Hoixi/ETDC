// Yetki kapıları. Her aksiyon öncesi guild yetkisini TEKRAR doğrular (sadece login yetmez).
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canManageGuild, getUserGuilds } from "./discord";

export async function requireSession() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  return session;
}

// Sayfa (server component) için: yetkisizse yönlendir.
export async function requireManageGuild(guildId: string) {
  const session = await requireSession();
  const ok = await canManageGuild(session.accessToken!, guildId);
  if (!ok) redirect("/dashboard");
  return session;
}

// API route için: yetkiyi boolean döndür (yönlendirme yok).
export async function checkManageGuild(guildId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.accessToken) return false;
  return canManageGuild(session.accessToken, guildId);
}

// ---- Oyuncu (arena) erişimi: yönetici değil, sadece sunucu ÜYESİ ----
async function isMember(accessToken: string, guildId: string): Promise<boolean> {
  const guilds = await getUserGuilds(accessToken);
  return guilds.some((g) => g.id === guildId);
}

// Sayfa için: üye değilse arena ana sayfaya yönlendir, session döndür (discordId içerir).
export async function requireMember(guildId: string) {
  const session = await requireSession();
  if (!(await isMember(session.accessToken!, guildId))) redirect("/arena");
  return session;
}

// API route için: üyelik + discordId döndür (yoksa null).
export async function checkMember(guildId: string): Promise<{ discordId: string } | null> {
  const session = await auth();
  if (!session?.accessToken || !session.discordId) return null;
  return (await isMember(session.accessToken, guildId)) ? { discordId: session.discordId } : null;
}
