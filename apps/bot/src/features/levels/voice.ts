// Sesli kanal XP'si: 60 saniyede bir, uygun üyelere voiceXpPerMin XP verir.
// Uygun = bot değil, sağır değil, ve kanalda en az 2 gerçek kişi var (yalnız XP farm engeli).
import { ChannelType, type Client, type GuildTextBasedChannel } from "discord.js";
import { getLevelConfig } from "../../lib/guildConfig.js";
import { addXp } from "./xp.js";
import { applyLevelRewards } from "./rewards.js";
import { announceLevelUp } from "./index.js";

const TICK_MS = 60_000;

export function startVoiceXpLoop(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    void tick(client);
  }, TICK_MS);
}

async function tick(client: Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    let cfg;
    try {
      cfg = await getLevelConfig(guild.id);
    } catch {
      continue;
    }
    if (!cfg.enabled || !cfg.voiceXpEnabled || cfg.voiceXpPerMin <= 0) continue;

    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;

      const humans = channel.members.filter((m) => !m.user.bot);
      if (humans.size < 2) continue; // yalnız/boş kanalda XP yok

      for (const member of humans.values()) {
        const vs = member.voice;
        if (vs.deaf || vs.selfDeaf || vs.suppress) continue; // dinlemiyor → XP yok

        const res = await addXp(guild.id, member.id, cfg.voiceXpPerMin);
        if (res.leveledUp) {
          const rewards = await applyLevelRewards(member, res.newLevel);
          if (cfg.announceLevelUp) {
            const announceCh = cfg.levelUpChannelId
              ? (guild.channels.cache.get(cfg.levelUpChannelId) as GuildTextBasedChannel | undefined)
              : undefined;
            await announceLevelUp(member, res.newLevel, cfg, rewards.map((r) => r.toString()), announceCh ?? null);
          }
        }
      }
    }
  }
}
