import { botApi } from "@/lib/botApi";
import { getConfig } from "@/lib/serverData";
import { StreamForm } from "@/components/forms/StreamForm";

export const dynamic = "force-dynamic";

export default async function StreamsPage({ params }: { params: { guildId: string } }) {
  const [config, channels, roles] = await Promise.all([
    getConfig(params.guildId, "streamConfig"),
    botApi.safe.channels(params.guildId),
    botApi.safe.roles(params.guildId),
  ]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Kick Yayın Bildirimi</h1>
      <p className="mb-6 text-sm text-gray-400">Kanal canlıya geçince Discord&apos;a otomatik bildirim.</p>
      <StreamForm guildId={params.guildId} config={config} channels={channels} roles={roles} />
    </div>
  );
}
