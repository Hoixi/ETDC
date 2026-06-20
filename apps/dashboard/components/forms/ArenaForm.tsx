"use client";

import { useState } from "react";
import { postJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import { Toggle } from "./fields";
import type { ArenaConfig } from "@/lib/config";

export function ArenaForm({ guildId, config }: { guildId: string; config: ArenaConfig }) {
  const [c, setC] = useState<ArenaConfig>(config);
  const { saving, msg, run } = useSave();
  const set = <K extends keyof ArenaConfig>(k: K, v: ArenaConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <section className="card">
      <div className="mb-4">
        <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="Arena açık" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Kasma süresi (dakika)</label>
          <input type="number" min={1} max={1440} className="input" value={c.grindMinutes}
            onChange={(e) => set("grindMinutes", Number(e.target.value))} />
          <p className="mt-1 text-xs text-gray-500">Test için 1 yapıp sonra 60&apos;a geri alabilirsin.</p>
        </div>
        <div>
          <label className="label">Oturum başına drop</label>
          <input type="number" min={1} max={20} className="input" value={c.dropsPerSession}
            onChange={(e) => set("dropsPerSession", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Avlanma bekleme (dakika)</label>
          <input type="number" min={0} max={1440} className="input" value={c.huntCooldownMin}
            onChange={(e) => set("huntCooldownMin", Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn" disabled={saving}
          onClick={() => run(() => postJSON(`/api/guilds/${guildId}/config/arenaConfig`, c).then(() => {}))}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
      </div>
    </section>
  );
}
