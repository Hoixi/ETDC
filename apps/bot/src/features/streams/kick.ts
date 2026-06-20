// Kick API'si (resmi değil/sınırlı) — kanal canlı mı diye polling.
// Endpoint değişirse SADECE bu dosya güncellenecek (izole tutuldu).
const BASE = "https://kick.com/api/v2/channels";

export interface KickLiveInfo {
  isLive: boolean;
  title: string;
  thumbnail: string | null;
  viewers: number;
  url: string;
  startedAt: string | null;
}

export async function fetchKickChannel(username: string): Promise<KickLiveInfo | null> {
  const slug = username.trim().toLowerCase();
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(slug)}`, {
      headers: {
        // Datacenter IP'lerinde bot kontrolü olabilir; gerçekçi UA gönder.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hoixi-Bot",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as KickChannelResponse;

    const live = data.livestream;
    return {
      isLive: Boolean(live?.is_live),
      title: live?.session_title ?? data.user?.username ?? slug,
      thumbnail: live?.thumbnail?.url ?? null,
      viewers: live?.viewer_count ?? 0,
      url: `https://kick.com/${slug}`,
      startedAt: live?.start_time ?? null,
    };
  } catch (err) {
    console.warn(`Kick API hatası (${slug}):`, (err as Error).message);
    return null;
  }
}

interface KickChannelResponse {
  user?: { username?: string };
  livestream: {
    is_live?: boolean;
    session_title?: string;
    viewer_count?: number;
    start_time?: string;
    thumbnail?: { url?: string };
  } | null;
}
