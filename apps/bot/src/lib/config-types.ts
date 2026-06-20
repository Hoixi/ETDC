// Guild JSON config alanlarının TS şekilleri + varsayılanları.
// DB'de Json olarak saklanır; burada tipli okuyup default'larla birleştiririz.

export interface WelcomeConfig {
  enabled: boolean;
  channelId: string | null;
  title: string; // placeholder destekli: {user} {username} {memberCount} {server}
  subtitle: string;
  backgroundUrl: string | null;
  color: string; // hex (#RRGGBB)
}

export interface GoodbyeConfig {
  enabled: boolean;
  channelId: string | null;
  title: string;
  subtitle: string;
  backgroundUrl: string | null;
  color: string;
}

export interface LevelConfig {
  enabled: boolean;
  xpPerMsg: number; // mesaj başına XP (min..max aralığı için taban)
  cooldownSec: number; // anti-spam
  levelUpChannelId: string | null; // null → mesajın geldiği kanal
  announceLevelUp: boolean;
  voiceXpEnabled: boolean;
  voiceXpPerMin: number; // sesli kanalda dakika başına XP
  cardStyle: string;
}

export interface MusicConfig {
  djRoleId: string | null;
  defaultVolume: number; // 0-100
  maxQueue: number;
  autoLeaveSec: number; // boş kanalda bu kadar saniye sonra ayrıl
}

export interface LogConfig {
  joinLeave: string | null; // kanal id
  modLog: string | null;
  messageLog: string | null;
}

export interface StreamConfig {
  enabled: boolean;
  kickChannel: string | null; // Kick kullanıcı adı (slug)
  discordChannelId: string | null; // bildirim kanalı
  pingRoleId: string | null; // canlıya geçince etiketlenecek rol
  pollSec: number; // kontrol aralığı (saniye)
}

export interface ArenaConfig {
  enabled: boolean;
  grindMinutes: number; // kasma oturum süresi (dakika)
  dropsPerSession: number; // oturum başına drop sayısı
}

export const DEFAULT_WELCOME: WelcomeConfig = {
  enabled: false,
  channelId: null,
  title: "Hoş geldin {user}!",
  subtitle: "{memberCount}. üyemizsin 🎉",
  backgroundUrl: null,
  color: "#5865F2",
};

export const DEFAULT_GOODBYE: GoodbyeConfig = {
  enabled: false,
  channelId: null,
  title: "{username} aramızdan ayrıldı",
  subtitle: "Görüşürüz 👋",
  backgroundUrl: null,
  color: "#ED4245",
};

export const DEFAULT_LEVEL: LevelConfig = {
  enabled: true,
  xpPerMsg: 15,
  cooldownSec: 60,
  levelUpChannelId: null,
  announceLevelUp: true,
  voiceXpEnabled: true,
  voiceXpPerMin: 10,
  cardStyle: "default",
};

export const DEFAULT_MUSIC: MusicConfig = {
  djRoleId: null,
  defaultVolume: 50,
  maxQueue: 100,
  autoLeaveSec: 300,
};

export const DEFAULT_LOG: LogConfig = {
  joinLeave: null,
  modLog: null,
  messageLog: null,
};

export const DEFAULT_STREAM: StreamConfig = {
  enabled: false,
  kickChannel: null,
  discordChannelId: null,
  pingRoleId: null,
  pollSec: 120,
};

export const DEFAULT_ARENA: ArenaConfig = {
  enabled: true,
  grindMinutes: 60,
  dropsPerSession: 6,
};

// Saklanan (kısmi/eski) JSON'ı default'la birleştir — eksik alanlar default'tan gelir.
export function merge<T>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object") return { ...defaults };
  return { ...defaults, ...(stored as Partial<T>) };
}
