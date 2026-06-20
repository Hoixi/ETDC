import { botApi } from "@/lib/botApi";
import { getConfig } from "@/lib/serverData";
import { WelcomeForm } from "@/components/forms/WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage({ params }: { params: { guildId: string } }) {
  const [welcome, goodbye, channels] = await Promise.all([
    getConfig(params.guildId, "welcomeConfig"),
    getConfig(params.guildId, "goodbyeConfig"),
    botApi.safe.channels(params.guildId),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Karşılama & Uğurlama</h1>
      <p className="mb-6 text-sm text-gray-400">Yeni üyeler için resimli karşılama kartı ayarla.</p>

      <WelcomeForm
        guildId={params.guildId}
        section="welcomeConfig"
        heading="🎉 Karşılama"
        description="Üye katıldığında gönderilir."
        config={welcome}
        channels={channels}
      />
      <WelcomeForm
        guildId={params.guildId}
        section="goodbyeConfig"
        heading="👋 Uğurlama"
        description="Üye ayrıldığında gönderilir."
        config={goodbye}
        channels={channels}
      />
    </div>
  );
}
