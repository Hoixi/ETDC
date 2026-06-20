"use client";

import { useState } from "react";
import { postJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import { ChannelSelect, RoleSelect, Toggle } from "./fields";
import type { StreamConfig } from "@/lib/config";
import type { ApiChannel, ApiRole } from "@/lib/botApi";

export function StreamForm({
  guildId,
  config,
  channels,
  roles,
}: {
  guildId: string;
  config: StreamConfig;
  channels: ApiChannel[];
  roles: ApiRole[];
}) {
  const [c, setC] = useState<StreamConfig>(config);
  const { saving, msg, run } = useSave();
  const set = <K extends keyof StreamConfig>(k: K, v: StreamConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <section className="card">
      <div className="mb-4">
        <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="Yayın bildirimi açık" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Kick Kullanıcı Adı</label>
          <input className="input" value={c.kickChannel ?? ""} placeholder="örn: hoixi"
            onChange={(e) => set("kickChannel", e.target.value || null)} />
        </div>
        <div>
          <label className="label">Bildirim Kanalı</label>
          <ChannelSelect channels={channels} value={c.discordChannelId} onChange={(v) => set("discordChannelId", v)} />
        </div>
        <div>
          <label className="label">Ping Rolü</label>
          <RoleSelect roles={roles} value={c.pingRoleId} onChange={(v) => set("pingRoleId", v)} placeholder="— ping yok —" />
        </div>
        <div>
          <label className="label">Kontrol Aralığı (saniye)</label>
          <input type="number" min={60} max={900} className="input" value={c.pollSec}
            onChange={(e) => set("pollSec", Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn" disabled={saving}
          onClick={() => run(() => postJSON(`/api/guilds/${guildId}/config/streamConfig`, c).then(() => {}))}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
      </div>
    </section>
  );
}
