"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GrindAnimation } from "./GrindAnimation";
import { AvatarBuilder } from "./AvatarBuilder";
import {
  RARITY, SLOT, EQUIP_MAIN, EQUIP_ACC, AFFIX, RARITY_ORDER,
  SKILL_TREE, SKILL_PATHS, RESPEC_COST,
  ABILITY_CATALOG, ADDON_CATALOG, ABILITY_BY_KEY, ADDON_BY_KEY, MAX_ABILITY_SLOTS, MAX_ADDONS,
  aggregateStats, powerScore, parseSkills, availablePoints, spentPoints, pathSpent, parseAbilities,
  type PlainItem, type Slot, type AffixType, type EquipCell,
  type Allocations, type SkillPath, type AbilityState,
} from "@/lib/arena";

const STAT_CAP: Record<string, number> = { atk: 400, def: 300, hp: 3000, spd: 200, luck: 150 };

function primText(it: PlainItem): string {
  const p: string[] = [];
  if (it.atk) p.push(`ATK ${it.atk}`);
  if (it.def) p.push(`DEF ${it.def}`);
  if (it.hp) p.push(`HP ${it.hp}`);
  if (it.spd) p.push(`SPD ${it.spd}`);
  if (it.luck) p.push(`LUCK ${it.luck}`);
  return p.join(" · ");
}
function affixText(it: PlainItem): string {
  return it.affixes.map((a) => `${AFFIX[a.type].label} ${a.value}${AFFIX[a.type].suffix}`).join(" · ");
}

export function ArenaScreen({
  guildId, username, level, stage, tokens, elo, skills: initialSkills, abilities: initialAbilities,
  grindEndsAt, grindCollected, avatar, items: initial,
}: {
  guildId: string; username: string; level: number; stage: number; tokens: number; elo: number;
  skills: Allocations; abilities: unknown; grindEndsAt: number | null; grindCollected: boolean;
  avatar: unknown; items: PlainItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<PlainItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState<string | null>(null); // sürüklenen kutu key'i
  const [tok, setTok] = useState(tokens);
  const [skills, setSkills] = useState<Allocations>(() => parseSkills(initialSkills));
  const [abil, setAbil] = useState<AbilityState>(() => parseAbilities(initialAbilities));
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function ability(
    action: "equip" | "unequip" | "attach" | "detach",
    payload: { key?: string; abilityKey?: string; addonKey?: string },
  ) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/arena/${guildId}/ability`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      setAbil(parseAbilities(data.abilities));
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const skillPointsLeft = availablePoints(level, skills);

  async function skill(action: "allocate" | "respec", nodeId?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/arena/${guildId}/skill`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      setSkills(parseSkills(data.skills));
      if (typeof data.tokens === "number") setTok(data.tokens);
      setMsg({ type: "ok", text: action === "respec" ? `🔄 Yetenekler sıfırlandı (-${RESPEC_COST} jeton)` : "Yetenek yükseltildi" });
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function econ(action: "salvage" | "upgrade" | "reroll" | "wheel", itemId?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/arena/${guildId}/economy`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      if (typeof data.tokens === "number") setTok(data.tokens);
      let m = "Tamam";
      if (action === "salvage") m = `🔥 Eritildi → +${data.gained} jeton`;
      else if (action === "upgrade") m = data.success ? `⬆️ Başarılı! Eşya +${data.upgrade} oldu (-${data.cost} jeton)` : `💢 Yükseltme başarısız! (-${data.cost} jeton)`;
      else if (action === "reroll") m = `🎲 Özel statlar yeniden atıldı (-${data.cost} jeton)`;
      else if (action === "wheel") {
        const r = data.reward;
        m = r.type === "jeton" ? `🎡 Çark: +${r.amount} jeton!`
          : r.type === "jackpot" ? `🎉 JACKPOT! ${r.item.name} (Legendary) düştü!`
          : `🎡 Çark: ${r.item.name} (${r.item.rarity}) düştü!`;
      }
      setMsg({ type: "ok", text: m });
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const equipped = useMemo(() => items.filter((i) => i.equipped), [items]);
  const bag = useMemo(
    () => items.filter((i) => !i.equipped).sort(
      (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.iLvl - a.iLvl,
    ),
    [items],
  );
  // Tekli slotlar için slot→item; yüzükler için ayrı (en fazla 2, kararlı sıra).
  const bySlot = useMemo(() => {
    const m: Partial<Record<Slot, PlainItem>> = {};
    for (const it of equipped) if (it.slot !== "RING") m[it.slot] = it;
    return m;
  }, [equipped]);
  const equippedRings = useMemo(
    () => equipped.filter((i) => i.slot === "RING").sort((a, b) => a.createdAt - b.createdAt),
    [equipped],
  );
  // Bir paper-doll kutusunun gösterdiği item.
  const cellItem = (c: EquipCell): PlainItem | undefined =>
    c.ringIndex != null ? equippedRings[c.ringIndex] : bySlot[c.slot];
  const stats = useMemo(() => aggregateStats(equipped), [equipped]);
  const power = useMemo(() => powerScore(stats), [stats]);

  async function api(itemId: string, action: "equip" | "unequip") {
    setBusy(true);
    // İyimser güncelleme (sunucu mantığını yansıtır: yüzük max 2, diğerleri 1).
    setItems((prev) => {
      const target = prev.find((x) => x.id === itemId);
      if (!target) return prev;
      if (action === "unequip") {
        return prev.map((it) => (it.id === itemId ? { ...it, equipped: false } : it));
      }
      const max = target.slot === "RING" ? 2 : 1;
      const others = prev
        .filter((x) => x.slot === target.slot && x.equipped && x.id !== itemId)
        .sort((a, b) => a.createdAt - b.createdAt);
      const remove = new Set(others.slice(0, Math.max(0, others.length - (max - 1))).map((x) => x.id));
      return prev.map((it) => {
        if (it.id === itemId) return { ...it, equipped: true };
        if (remove.has(it.id)) return { ...it, equipped: false };
        return it;
      });
    });
    try {
      const res = await fetch(`/api/arena/${guildId}/equip`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setItems(initial);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(slot: Slot, e: React.DragEvent) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const it = items.find((x) => x.id === id);
    if (it && it.slot === slot && !it.equipped) api(id, "equip");
  }

  // Tek bir paper-doll kutusu (ana ekipman veya takı; yüzük kutuları için ringIndex'li).
  function renderCell(c: EquipCell) {
    const it = cellItem(c);
    const isOver = over === c.key;
    const label =
      c.ringIndex != null ? `${SLOT.RING.label} ${c.ringIndex + 1}` : SLOT[c.slot].label;
    return (
      <div
        key={c.key}
        onDragOver={(e) => { e.preventDefault(); setOver(c.key); }}
        onDragLeave={() => setOver((s) => (s === c.key ? null : s))}
        onDrop={(e) => onDrop(c.slot, e)}
        onClick={() => it && !busy && api(it.id, "unequip")}
        className={`min-h-[92px] rounded-lg border p-3 transition ${
          it ? "cursor-pointer bg-bg-soft hover:border-red-500" : "border-dashed bg-transparent"
        } ${isOver ? "border-neon-pink shadow-neon" : ""}`}
        style={it ? { borderColor: RARITY[it.rarity].color } : { borderColor: "#33214d" }}
        title={it ? "Çıkarmak için tıkla" : ""}
      >
        <div className="mb-1 text-[11px] text-gray-500">{SLOT[c.slot].icon} {label}</div>
        {it ? (
          <>
            <div className="text-sm font-medium text-white">{it.name}{it.upgrade > 0 ? ` +${it.upgrade}` : ""}</div>
            <RarityChip item={it} />
            <div className="mt-1 text-[11px] text-gray-400">{primText(it)}</div>
            {it.affixes.length > 0 && <div className="text-[11px] text-neon-cyan">{affixText(it)}</div>}
            {it.passive && <div className="text-[11px] text-neon-gold">✨ {it.passive}</div>}
          </>
        ) : (
          <div className="flex h-12 items-center justify-center text-xs text-gray-600">buraya sürükle</div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-xl shadow-neon">🎪</div>
        <div className="flex-1 min-w-[140px]">
          <h1 className="neon-title text-2xl">{username}</h1>
          <div className="text-xs text-gray-400">Karnaval Arenası</div>
        </div>
        <Metric label="Güç" value={`⚡ ${power}`} glow />
        <Metric label="Stage" value={`🎪 ${stage}`} />
        <Metric label="Seviye" value={String(level)} />
        <Metric label="Puan" value={`🌟 ${skillPointsLeft}`} glow={skillPointsLeft > 0} />
        <Metric label="Jeton" value={`🎟️ ${tok}`} />
        <Metric label="Rank" value={`🏆 ${elo}`} />
      </div>

      <GrindAnimation endsAt={grindEndsAt} collected={grindCollected} stage={stage} />

      <AvatarBuilder guildId={guildId} avatar={avatar} power={power} stage={stage} />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ekipman */}
        <section className="card">
          <h2 className="mb-3 text-sm font-medium text-neon-purple">Ana Ekipman</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EQUIP_MAIN.map(renderCell)}
          </div>
          <h2 className="mb-3 mt-4 text-sm font-medium text-neon-gold">Takı</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EQUIP_ACC.map(renderCell)}
          </div>
        </section>

        {/* Statlar */}
        <section className="card">
          <h2 className="mb-3 text-sm font-medium text-neon-purple">İstatistikler</h2>
          <div className="space-y-2">
            {(["atk", "def", "hp", "spd", "luck"] as const).map((k) => (
              <Bar key={k} label={k.toUpperCase()} value={stats[k]} cap={STAT_CAP[k]} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.entries(stats.affixes) as [AffixType, number][]).map(([k, v]) => (
              <span key={k} className="rounded-md bg-bg-soft px-2 py-1 text-xs text-neon-cyan">
                {AFFIX[k].label} {v}{AFFIX[k].suffix}
              </span>
            ))}
            {Object.keys(stats.affixes).length === 0 && (
              <span className="text-xs text-gray-600">Rare+ eşya giy → özel statlar burada</span>
            )}
          </div>
        </section>
      </div>

      {/* Çanta */}
      <section className="card mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neon-purple">Çanta ({bag.length})</h2>
          <span className="text-xs text-gray-500">sürükle-bırak ile giy · slota tıkla → çıkar</span>
        </div>
        {bag.length === 0 ? (
          <div className="text-sm text-gray-500">Çanta boş. Discord&apos;da <code>/kas</code> ile eşya kas!</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {bag.map((it) => (
              <div
                key={it.id}
                draggable={!busy}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                onDoubleClick={() => !busy && api(it.id, "equip")}
                className={`cursor-grab rounded-lg border bg-bg-soft p-2 active:cursor-grabbing ${
                  it.rarity === "LEGENDARY" ? "shadow-neon-gold" : ""
                }`}
                style={{ borderColor: RARITY[it.rarity].color }}
                title="Sürükle ya da çift tıkla → giy"
              >
                <div className="text-xs font-medium text-white">{it.name}{it.upgrade > 0 ? ` +${it.upgrade}` : ""}</div>
                <RarityChip item={it} />
                <div className="mt-1 text-[11px] text-gray-400">{SLOT[it.slot].icon} {primText(it)}</div>
                {it.affixes.length > 0 && <div className="text-[11px] text-neon-cyan">{affixText(it)}</div>}
                {it.passive && <div className="text-[11px] text-neon-gold">✨ {it.passive}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button onClick={() => econ("upgrade", it.id)} disabled={busy} className="rounded bg-bg-hover px-2 py-0.5 text-[10px] hover:bg-accent-soft disabled:opacity-50">⬆️ Yükselt</button>
                  {it.affixes.length > 0 && (
                    <button onClick={() => econ("reroll", it.id)} disabled={busy} className="rounded bg-bg-hover px-2 py-0.5 text-[10px] hover:bg-accent-soft disabled:opacity-50">🎲 Reroll</button>
                  )}
                  <button onClick={() => econ("salvage", it.id)} disabled={busy} className="rounded bg-bg-hover px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/40 disabled:opacity-50">🔥 Erit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pasif Yetenekler (Dilim C) */}
      <section className="card mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-neon-purple">
            Pasif Yetenekler · <span className="text-neon-gold">🌟 {skillPointsLeft} puan</span>
          </h2>
          <button
            className="rounded bg-bg-hover px-3 py-1 text-xs hover:bg-red-900/40 disabled:opacity-50"
            disabled={busy || spentPoints(skills) === 0 || tok < RESPEC_COST}
            onClick={() => skill("respec")}
            title={`Tüm puanları geri al (${RESPEC_COST} jeton)`}
          >
            🔄 Sıfırla ({RESPEC_COST} 🎟️)
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(SKILL_PATHS) as SkillPath[]).map((path) => {
            const p = SKILL_PATHS[path];
            const spent = pathSpent(skills, path);
            return (
              <div key={path} className="rounded-lg border border-border bg-bg-soft p-3">
                <div className="mb-2 text-sm font-medium" style={{ color: p.color }}>
                  {p.emoji} {p.label} <span className="text-[11px] text-gray-500">· {spent} puan</span>
                </div>
                <div className="space-y-2">
                  {SKILL_TREE.filter((n) => n.path === path).map((n) => {
                    const rank = skills[n.id] ?? 0;
                    const locked = spent < n.requires;
                    const maxed = rank >= n.maxRank;
                    const canAdd = !locked && !maxed && skillPointsLeft > 0 && !busy;
                    return (
                      <div key={n.id} className={`rounded-md border p-2 ${locked ? "opacity-50" : ""}`}
                        style={{ borderColor: rank > 0 ? p.color : "#33214d" }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-white">
                              {locked ? "🔒 " : ""}{n.name} <span className="text-gray-500">{rank}/{n.maxRank}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {n.desc}{locked ? ` · ${n.requires} puan gerek` : " / kademe"}
                            </div>
                          </div>
                          <button
                            className="shrink-0 rounded bg-bg-hover px-2 py-1 text-xs font-bold hover:bg-accent-soft disabled:opacity-30"
                            disabled={!canAdd}
                            onClick={() => skill("allocate", n.id)}
                            title={maxed ? "Maksimum" : locked ? "Kilitli" : "Yükselt"}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Aktif Yetenekler (Dilim D) */}
      <section className="card mt-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-neon-purple">Aktif Yetenekler</h2>
          <span className="text-xs text-gray-500">{abil.equipped.length}/{MAX_ABILITY_SLOTS} slot · dövüşte tetiklenir</span>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          <code>/topla</code>&apos;dan düşer. {MAX_ABILITY_SLOTS} slota tak; her yeteneğe en fazla {MAX_ADDONS} addon ekle.
        </p>

        {/* Takılı slotlar */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: MAX_ABILITY_SLOTS }).map((_, i) => {
            const key = abil.equipped[i];
            const def = key ? ABILITY_BY_KEY[key] : null;
            const attached = key ? (abil.attached[key] ?? []) : [];
            const addonPool = Object.entries(abil.addonsOwned).filter(([, c]) => c > 0);
            return (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: def ? "#ff2e97" : "#33214d" }}>
                <div className="mb-1 text-[11px] text-gray-500">Yetenek Slotu {i + 1}</div>
                {def ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-white">{def.emoji} {def.name}</div>
                      <button className="rounded bg-bg-hover px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                        disabled={busy} onClick={() => ability("unequip", { key })}>Çıkar</button>
                    </div>
                    <div className="text-[11px] text-gray-400">{def.desc}</div>
                    {/* Takılı addonlar */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {attached.map((ak, j) => (
                        <button key={j} className="rounded bg-accent-soft px-2 py-0.5 text-[10px] text-neon-cyan hover:bg-red-900/40 disabled:opacity-50"
                          disabled={busy} title="Sök" onClick={() => ability("detach", { abilityKey: key, addonKey: ak })}>
                          {ADDON_BY_KEY[ak]?.emoji} {ADDON_BY_KEY[ak]?.name} ✕
                        </button>
                      ))}
                      {attached.length === 0 && <span className="text-[10px] text-gray-600">addon yok</span>}
                    </div>
                    {/* Eklenebilir addonlar */}
                    {attached.length < MAX_ADDONS && addonPool.length > 0 && (
                      <div className="mt-2 border-t border-border pt-2">
                        <div className="mb-1 text-[10px] text-gray-500">Addon ekle:</div>
                        <div className="flex flex-wrap gap-1">
                          {addonPool.map(([ak, c]) => (
                            <button key={ak} className="rounded bg-bg-hover px-2 py-0.5 text-[10px] hover:bg-accent-soft disabled:opacity-50"
                              disabled={busy} onClick={() => ability("attach", { abilityKey: key, addonKey: ak })}>
                              + {ADDON_BY_KEY[ak]?.emoji} {ADDON_BY_KEY[ak]?.name} ({c})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-16 items-center justify-center text-xs text-gray-600">boş slot</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sahip olunan (takılı olmayan) yetenekler */}
        <div className="mt-3">
          <div className="mb-1 text-[11px] text-gray-500">Yeteneklerin</div>
          <div className="flex flex-wrap gap-2">
            {abil.owned.filter((k) => !abil.equipped.includes(k)).map((k) => (
              <button key={k} className="rounded-md border border-border bg-bg-soft px-2 py-1 text-xs hover:border-neon-pink disabled:opacity-50"
                disabled={busy || abil.equipped.length >= MAX_ABILITY_SLOTS}
                title={abil.equipped.length >= MAX_ABILITY_SLOTS ? "Slotlar dolu" : "Tak"}
                onClick={() => ability("equip", { key: k })}>
                {ABILITY_BY_KEY[k]?.emoji} {ABILITY_BY_KEY[k]?.name} <span className="text-neon-gold">+ Tak</span>
              </button>
            ))}
            {abil.owned.filter((k) => !abil.equipped.includes(k)).length === 0 && (
              <span className="text-xs text-gray-600">Tüm yeteneklerin takılı ya da henüz yeteneğin yok.</span>
            )}
          </div>
        </div>

        {/* Addon havuzu */}
        <div className="mt-3">
          <div className="mb-1 text-[11px] text-gray-500">Addon havuzun</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(abil.addonsOwned).filter(([, c]) => c > 0).map(([ak, c]) => (
              <span key={ak} className="rounded-md bg-bg-soft px-2 py-1 text-xs text-gray-300">
                {ADDON_BY_KEY[ak]?.emoji} {ADDON_BY_KEY[ak]?.name} ×{c}
              </span>
            ))}
            {Object.values(abil.addonsOwned).every((c) => c <= 0) && (
              <span className="text-xs text-gray-600">Henüz addon yok — <code>/topla</code> ile düşür.</span>
            )}
          </div>
        </div>
      </section>

      {/* Atölye (Dilim 4) */}
      <section className="card mt-4">
        <h2 className="mb-1 text-sm font-medium text-neon-purple">Atölye</h2>
        <p className="mb-3 text-xs text-gray-500">
          🔥 Erit · ⬆️ Yükselt · 🎲 Reroll → çantadaki eşyaların üstünde. Şans çarkı 50 jeton.
        </p>
        <button className="btn" disabled={busy || tok < 50} onClick={() => econ("wheel")}>
          🎡 Şans Çarkı (50 🎟️)
        </button>
      </section>
    </div>
  );
}

function Metric({ label, value, glow }: { label: string; value: string; glow?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-bg-card px-3 py-2 ${glow ? "shadow-neon" : ""}`}>
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-lg font-medium text-white">{value}</div>
    </div>
  );
}

function RarityChip({ item }: { item: PlainItem }) {
  const r = RARITY[item.rarity];
  return (
    <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${r.color}22`, color: r.color }}>
      {r.label} · iLvl {item.iLvl}
    </span>
  );
}

function Bar({ label, value, cap }: { label: string; value: number; cap: number }) {
  const pct = Math.min(100, Math.round((value / cap) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-bg-soft">
        <div className="h-full rounded bg-neon-pink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
