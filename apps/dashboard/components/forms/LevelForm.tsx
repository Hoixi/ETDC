"use client";

import { useState } from "react";
import { postJSON, sendJSON } from "@/lib/clientApi";
import { useSave } from "./useSave";
import { ChannelSelect, RoleSelect, Toggle } from "./fields";
import type { LevelConfig } from "@/lib/config";
import type { ApiChannel, ApiRole } from "@/lib/botApi";

interface Reward {
  id: string;
  level: number;
  roleId: string;
}

export function LevelForm({
  guildId,
  config,
  channels,
  roles,
  initialRewards,
}: {
  guildId: string;
  config: LevelConfig;
  channels: ApiChannel[];
  roles: ApiRole[];
  initialRewards: Reward[];
}) {
  const [c, setC] = useState<LevelConfig>(config);
  const { saving, msg, run } = useSave();
  const set = <K extends keyof LevelConfig>(k: K, v: LevelConfig[K]) => setC((p) => ({ ...p, [k]: v }));

  const [rewards, setRewards] = useState<Reward[]>(initialRewards);
  const [newLevel, setNewLevel] = useState(10);
  const [newRole, setNewRole] = useState<string | null>(roles[0]?.id ?? null);
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);

  async function addReward() {
    if (!newRole) return;
    try {
      const r = await postJSON<Reward>(`/api/guilds/${guildId}/rewards`, { level: newLevel, roleId: newRole });
      setRewards((prev) => [...prev.filter((x) => x.level !== r.level), r].sort((a, b) => a.level - b.level));
      setRewardMsg(null);
    } catch (e) {
      setRewardMsg((e as Error).message);
    }
  }
  async function delReward(level: number) {
    await sendJSON("DELETE", `/api/guilds/${guildId}/rewards?level=${level}`).catch(() => {});
    setRewards((prev) => prev.filter((x) => x.level !== level));
  }

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <>
      <section className="card mb-6">
        <div className="mb-4">
          <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="XP sistemi açık" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Mesaj Başına XP</label>
            <input type="number" min={1} max={100} className="input" value={c.xpPerMsg} onChange={(e) => set("xpPerMsg", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Cooldown (saniye)</label>
            <input type="number" min={0} max={600} className="input" value={c.cooldownSec} onChange={(e) => set("cooldownSec", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Level-up Duyuru Kanalı (boş = mesajın kanalı)</label>
            <ChannelSelect channels={channels} value={c.levelUpChannelId} onChange={(v) => set("levelUpChannelId", v)} />
          </div>
          <div className="flex items-end gap-4">
            <Toggle checked={c.announceLevelUp} onChange={(v) => set("announceLevelUp", v)} label="Duyuru yap" />
          </div>
          <div className="flex items-end">
            <Toggle checked={c.voiceXpEnabled} onChange={(v) => set("voiceXpEnabled", v)} label="Sesli XP açık" />
          </div>
          <div>
            <label className="label">Sesli XP (dakika başına)</label>
            <input type="number" min={1} max={100} className="input" value={c.voiceXpPerMin} onChange={(e) => set("voiceXpPerMin", Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button className="btn" disabled={saving}
            onClick={() => run(() => postJSON(`/api/guilds/${guildId}/config/levelConfig`, c).then(() => {}))}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {msg && <span className={msg.type === "ok" ? "text-green-400" : "text-red-400"}>{msg.text}</span>}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold text-white">Level Ödül Rolleri</h2>
        <p className="mb-4 text-sm text-gray-400">Belirli levele ulaşan üyeye otomatik rol ver.</p>

        <div className="mb-4 space-y-2">
          {rewards.length === 0 && <div className="text-sm text-gray-500">Henüz ödül yok.</div>}
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-2">
              <span className="text-sm">
                <strong>Level {r.level}</strong> → {roleName(r.roleId)}
              </span>
              <button className="text-sm text-red-400 hover:text-red-300" onClick={() => delReward(r.level)}>Sil</button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Level</label>
            <input type="number" min={1} className="input w-24" value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))} />
          </div>
          <div className="min-w-48">
            <label className="label">Rol</label>
            <RoleSelect roles={roles} value={newRole} onChange={setNewRole} placeholder="— rol seç —" />
          </div>
          <button className="btn-ghost" onClick={addReward}>Ekle</button>
          {rewardMsg && <span className="text-red-400">{rewardMsg}</span>}
        </div>
      </section>
    </>
  );
}
