import { prisma } from "@hoixi/db";
import { botApi } from "@/lib/botApi";
import { getConfig } from "@/lib/serverData";
import { LevelForm } from "@/components/forms/LevelForm";

export const dynamic = "force-dynamic";

export default async function LevelsPage({ params }: { params: { guildId: string } }) {
  const [config, rewards, channels, roles] = await Promise.all([
    getConfig(params.guildId, "levelConfig"),
    prisma.levelReward.findMany({ where: { guildId: params.guildId }, orderBy: { level: "asc" } }),
    botApi.safe.channels(params.guildId),
    botApi.safe.roles(params.guildId),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Level Sistemi</h1>
      <p className="mb-6 text-sm text-gray-400">XP ayarları ve level ödül rolleri.</p>
      <LevelForm guildId={params.guildId} config={config} channels={channels} roles={roles} initialRewards={rewards} />
    </div>
  );
}
