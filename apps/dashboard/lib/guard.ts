// Yetki kapıları. Her aksiyon öncesi guild yetkisini TEKRAR doğrular (sadece login yetmez).
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canManageGuild } from "./discord";

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
