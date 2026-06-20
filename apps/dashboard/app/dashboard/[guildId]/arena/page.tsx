import { getConfig } from "@/lib/serverData";
import { ArenaForm } from "@/components/forms/ArenaForm";

export const dynamic = "force-dynamic";

export default async function ArenaSettingsPage({ params }: { params: { guildId: string } }) {
  const config = await getConfig(params.guildId, "arenaConfig");
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Karnaval Arenası</h1>
      <p className="mb-6 text-sm text-gray-400">
        Kasma süresi ve drop ayarları. Oyuncular karakterlerini{" "}
        <code>panel.enterthedarkcarnival.com/arena</code> üzerinden yönetir.
      </p>
      <ArenaForm guildId={params.guildId} config={config} />
    </div>
  );
}
