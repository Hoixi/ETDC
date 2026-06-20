"use client";

import { useState } from "react";
import { postJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import { ChannelSelect } from "./fields";
import type { LogConfig } from "@/lib/config";
import type { ApiChannel } from "@/lib/botApi";

export function LoggingForm({
  guildId,
  config,
  channels,
}: {
  guildId: string;
  config: LogConfig;
  channels: ApiChannel[];
}) {
  const [c, setC] = useState<LogConfig>(config);
  const { saving, msg, run } = useSave();
  const set = (k: keyof LogConfig, v: string | null) => setC((p) => ({ ...p, [k]: v }));

  return (
    <section className="card">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">📥 Giriş / Çıkış</label>
          <ChannelSelect channels={channels} value={c.joinLeave} onChange={(v) => set("joinLeave", v)} />
        </div>
        <div>
          <label className="label">⚖️ Moderasyon</label>
          <ChannelSelect channels={channels} value={c.modLog} onChange={(v) => set("modLog", v)} />
        </div>
        <div>
          <label className="label">✏️ Mesaj (sil/düzenle)</label>
          <ChannelSelect channels={channels} value={c.messageLog} onChange={(v) => set("messageLog", v)} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          className="btn"
          disabled={saving}
          onClick={() => run(() => postJSON(`/api/guilds/${guildId}/config/logConfig`, c).then(() => {}))}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
      </div>
    </section>
  );
}
