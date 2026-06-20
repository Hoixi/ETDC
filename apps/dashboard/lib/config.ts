// Panel tarafı config tipleri + default'lar (bot/src/lib/config-types.ts ile aynı şekil).
// Bot src'sini import edemediğimiz için burada ayna tutuluyor.
export interface WelcomeConfig {
  enabled: boolean;
  channelId: string | null;
  title: string;
  subtitle: string;
  backgroundUrl: string | null;
  color: string;
}
export interface LevelConfig {
  enabled: boolean;
  xpPerMsg: number;
  cooldownSec: number;
  levelUpChannelId: string | null;
  announceLevelUp: boolean;
  voiceXpEnabled: boolean;
  voiceXpPerMin: number;
  cardStyle: string;
}
export interface MusicConfig {
  djRoleId: string | null;
  defaultVolume: number;
  maxQueue: number;
  autoLeaveSec: number;
}
export interface LogConfig {
  joinLeave: string | null;
  modLog: string | null;
  messageLog: string | null;
}
export interface StreamConfig {
  enabled: boolean;
  kickChannel: string | null;
  discordChannelId: string | null;
  pingRoleId: string | null;
  pollSec: number;
}

export const DEFAULTS = {
  welcomeConfig: {
    enabled: false,
    channelId: null,
    title: "Hoş geldin {user}!",
    subtitle: "{memberCount}. üyemizsin 🎉",
    backgroundUrl: null,
    color: "#5865F2",
  } as WelcomeConfig,
  goodbyeConfig: {
    enabled: false,
    channelId: null,
    title: "{username} aramızdan ayrıldı",
    subtitle: "Görüşürüz 👋",
    backgroundUrl: null,
    color: "#ED4245",
  } as WelcomeConfig,
  levelConfig: {
    enabled: true,
    xpPerMsg: 15,
    cooldownSec: 60,
    levelUpChannelId: null,
    announceLevelUp: true,
    voiceXpEnabled: true,
    voiceXpPerMin: 10,
    cardStyle: "default",
  } as LevelConfig,
  musicConfig: {
    djRoleId: null,
    defaultVolume: 50,
    maxQueue: 100,
    autoLeaveSec: 300,
  } as MusicConfig,
  logConfig: { joinLeave: null, modLog: null, messageLog: null } as LogConfig,
  streamConfig: {
    enabled: false,
    kickChannel: null,
    discordChannelId: null,
    pingRoleId: null,
    pollSec: 120,
  } as StreamConfig,
};

export type ConfigSection = keyof typeof DEFAULTS;

export function mergeConfig<K extends ConfigSection>(
  section: K,
  stored: unknown,
): (typeof DEFAULTS)[K] {
  if (!stored || typeof stored !== "object") return { ...DEFAULTS[section] };
  return { ...DEFAULTS[section], ...(stored as object) } as (typeof DEFAULTS)[K];
}
