"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RARITY, SLOT, SLOT_ORDER, AFFIX, RARITY_ORDER,
  aggregateStats, powerScore,
  type PlainItem, type Slot, type AffixType,
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
  guildId, username, level, tokens, elo, items: initial,
}: {
  guildId: string; username: string; level: number; tokens: number; elo: number; items: PlainItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<PlainItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState<Slot | null>(null);
  const [tok, setTok] = useState(tokens);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
  const bySlot = useMemo(() => {
    const m: Partial<Record<Slot, PlainItem>> = {};
    for (const it of equipped) m[it.slot] = it;
    return m;
  }, [equipped]);
  const stats = useMemo(() => aggregateStats(equipped), [equipped]);
  const power = useMemo(() => powerScore(stats), [stats]);

  async function api(itemId: string, action: "equip" | "unequip") {
    setBusy(true);
    setItems((prev) => {
      const target = prev.find((x) => x.id === itemId);
      if (!target) return prev;
      return prev.map((it) => {
        if (it.id === itemId) return { ...it, equipped: action === "equip" };
        if (action === "equip" && it.slot === target.slot) return { ...it, equipped: false };
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
        <Metric label="Seviye" value={String(level)} />
        <Metric label="Jeton" value={`🎟️ ${tok}`} />
        <Metric label="Rank" value={`🏆 ${elo}`} />
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ekipman */}
        <section className="card">
          <h2 className="mb-3 text-sm font-medium text-neon-purple">Ekipman</h2>
          <div className="grid grid-cols-2 gap-3">
            {SLOT_ORDER.map((slot) => {
              const it = bySlot[slot];
              const isOver = over === slot;
              return (
                <div
                  key={slot}
                  onDragOver={(e) => { e.preventDefault(); setOver(slot); }}
                  onDragLeave={() => setOver((s) => (s === slot ? null : s))}
                  onDrop={(e) => onDrop(slot, e)}
                  onClick={() => it && !busy && api(it.id, "unequip")}
                  className={`min-h-[92px] rounded-lg border p-3 transition ${
                    it ? "cursor-pointer bg-bg-soft hover:border-red-500" : "border-dashed bg-transparent"
                  } ${isOver ? "border-neon-pink shadow-neon" : ""}`}
                  style={it ? { borderColor: RARITY[it.rarity].color } : { borderColor: "#33214d" }}
                  title={it ? "Çıkarmak için tıkla" : ""}
                >
                  <div className="mb-1 text-[11px] text-gray-500">{SLOT[slot].icon} {SLOT[slot].label}</div>
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
            })}
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
