import { botApi } from "@/lib/botApi";
import { getConfig } from "@/lib/serverData";
import { LoggingForm } from "@/components/forms/LoggingForm";

export const dynamic = "force-dynamic";

export default async function LoggingPage({ params }: { params: { guildId: string } }) {
  const [config, channels] = await Promise.all([
    getConfig(params.guildId, "logConfig"),
    botApi.safe.channels(params.guildId),
  ]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Loglama</h1>
      <p className="mb-6 text-sm text-gray-400">Hangi olayların nereye loglanacağını seç.</p>
      <LoggingForm guildId={params.guildId} config={config} channels={channels} />
    </div>
  );
}
