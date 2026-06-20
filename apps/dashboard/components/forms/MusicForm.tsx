"use client";

import { useState } from "react";
import { postJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import { RoleSelect } from "./fields";
import type { MusicConfig } from "@/lib/config";
import type { ApiRole } from "@/lib/botApi";

export function MusicForm({
  guildId,
  config,
  roles,
}: {
  guildId: string;
  config: MusicConfig;
  roles: ApiRole[];
}) {
  const [c, setC] = useState<MusicConfig>(config);
  const { saving, msg, run } = useSave();
  const set = <K extends keyof MusicConfig>(k: K, v: MusicConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <section className="card">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">DJ Rolü (skip/stop/volume bu role açık)</label>
          <RoleSelect roles={roles} value={c.djRoleId} onChange={(v) => set("djRoleId", v)} />
        </div>
        <div>
          <label className="label">Varsayılan Ses (0-150)</label>
          <input type="number" min={0} max={150} className="input" value={c.defaultVolume}
            onChange={(e) => set("defaultVolume", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Maksimum Kuyruk</label>
          <input type="number" min={1} max={1000} className="input" value={c.maxQueue}
            onChange={(e) => set("maxQueue", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Boş Kanalda Ayrılma (saniye)</label>
          <input type="number" min={30} max={3600} className="input" value={c.autoLeaveSec}
            onChange={(e) => set("autoLeaveSec", Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn" disabled={saving}
          onClick={() => run(() => postJSON(`/api/guilds/${guildId}/config/musicConfig`, c).then(() => {}))}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
      </div>
    </section>
  );
}
