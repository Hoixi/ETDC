import { botApi } from "@/lib/botApi";
import { getConfig } from "@/lib/serverData";
import { MusicForm } from "@/components/forms/MusicForm";

export const dynamic = "force-dynamic";

export default async function MusicPage({ params }: { params: { guildId: string } }) {
  const [config, roles] = await Promise.all([
    getConfig(params.guildId, "musicConfig"),
    botApi.safe.roles(params.guildId),
  ]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Müzik</h1>
      <p className="mb-6 text-sm text-gray-400">DJ rolü, varsayılan ses ve kuyruk ayarları.</p>
      <MusicForm guildId={params.guildId} config={config} roles={roles} />
    </div>
  );
}
