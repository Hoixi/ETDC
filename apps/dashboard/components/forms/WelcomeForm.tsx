"use client";

import { useState } from "react";
import { postJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import type { WelcomeConfig } from "@/lib/config";
import type { ApiChannel } from "@/lib/botApi";

export function WelcomeForm({
  guildId,
  section,
  heading,
  description,
  config,
  channels,
}: {
  guildId: string;
  section: "welcomeConfig" | "goodbyeConfig";
  heading: string;
  description: string;
  config: WelcomeConfig;
  channels: ApiChannel[];
}) {
  const [c, setC] = useState<WelcomeConfig>(config);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { saving, msg, run } = useSave();

  const set = <K extends keyof WelcomeConfig>(k: K, v: WelcomeConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  async function save() {
    await run(() => postJSON(`/api/guilds/${guildId}/config/${section}`, c).then(() => {}));
  }

  async function makePreview() {
    setPreviewing(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/preview/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: c.title, subtitle: c.subtitle, backgroundUrl: c.backgroundUrl, color: c.color, serverName: "Sunucu", username: "Üye" }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setPreview(URL.createObjectURL(blob));
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <section className="card mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{heading}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          Açık
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Kanal</label>
          <select className="input" value={c.channelId ?? ""} onChange={(e) => set("channelId", e.target.value || null)}>
            <option value="">— seç —</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Vurgu Rengi</label>
          <input type="color" className="input h-10 p-1" value={c.color} onChange={(e) => set("color", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Başlık</label>
          <input className="input" value={c.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Alt Başlık</label>
          <input className="input" value={c.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Arka Plan Görsel URL (boş = gradient)</label>
          <input className="input" value={c.backgroundUrl ?? ""} onChange={(e) => set("backgroundUrl", e.target.value || null)} placeholder="https://..." />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Placeholder: <code>{"{user}"}</code> <code>{"{username}"}</code> <code>{"{memberCount}"}</code> <code>{"{server}"}</code>
      </p>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="önizleme" className="mt-4 w-full rounded-lg border border-border" />
      )}

      <div className="mt-5 flex items-center gap-3">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button className="btn-ghost" onClick={makePreview} disabled={previewing}>
          {previewing ? "Önizleniyor…" : "Önizleme"}
        </button>
        {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
      </div>
    </section>
  );
}
