import { botApi } from "@/lib/botApi";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: { guildId: string } }) {
  const info = await botApi.safe.guildInfo(params.guildId);
  const health = await botApi.health().catch(() => null);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Ayarlar</h1>
      <p className="mb-6 text-sm text-gray-400">Genel sunucu bilgileri ve bot durumu.</p>

      <section className="card mb-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Sunucu</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-gray-500">Ad</dt><dd>{info?.name ?? "—"}</dd></div>
          <div><dt className="text-gray-500">Üye sayısı</dt><dd>{info?.memberCount ?? "—"}</dd></div>
          <div><dt className="text-gray-500">Guild ID</dt><dd className="font-mono text-xs">{params.guildId}</dd></div>
          <div><dt className="text-gray-500">Bot rol pozisyonu</dt><dd>{info?.botHighestRolePosition ?? "—"}</dd></div>
        </dl>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold text-white">Bot Durumu</h2>
        {health?.ok ? (
          <p className="text-sm text-green-400">🟢 Bot çevrimiçi ({health.user})</p>
        ) : (
          <p className="text-sm text-red-400">🔴 Bot iç API&apos;sine ulaşılamıyor (bot kapalı olabilir).</p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Slash komutlarını yeniden kaydetmek için sunucuda <code>pnpm bot:deploy</code> çalıştır.
        </p>
      </section>
    </div>
  );
}
