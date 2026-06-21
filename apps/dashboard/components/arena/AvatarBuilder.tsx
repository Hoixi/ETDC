"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_CATEGORIES, parseAvatar, type AvatarSelection } from "@/lib/avatar";
import { AvatarView } from "./AvatarView";

// Karakter görünümü: solda canlı önizleme (loadout çerçevesi), sağda kategori seçicileri.
export function AvatarBuilder({
  guildId, avatar, power, stage,
}: { guildId: string; avatar: unknown; power: number; stage: number }) {
  const router = useRouter();
  const [sel, setSel] = useState<AvatarSelection>(() => parseAvatar(avatar));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function choose(catKey: string, optId: string | null) {
    setSel((s) => ({ ...s, [catKey]: optId }));
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/arena/${guildId}/avatar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: sel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      setDirty(false);
      setMsg({ type: "ok", text: "💾 Karakter kaydedildi!" });
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neon-purple">Karakter Görünümü</h2>
        <button className="btn" disabled={busy || !dirty} onClick={save}>
          {busy ? "Kaydediliyor…" : dirty ? "💾 Kaydet" : "Kaydedildi"}
        </button>
      </div>

      {msg && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
        {/* Önizleme + loadout çerçevesi */}
        <div className="relative mx-auto w-full max-w-[260px]">
          <div className="relative overflow-hidden rounded-2xl border-2 border-neon-pink/60 bg-gradient-to-b from-[#140a1f] to-[#0b0712] shadow-neon">
            <AvatarView selection={sel} />
            {/* rozetler */}
            <div className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs text-neon-gold">⚡ {power}</div>
            <div className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs text-neon-pink">🎪 {stage}</div>
          </div>
        </div>

        {/* Kategori seçicileri */}
        <div className="space-y-3">
          {AVATAR_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="mb-1 text-[11px] text-gray-500">{cat.label}</div>
              <div className="flex flex-wrap gap-2">
                {cat.optional && (
                  <OptBtn active={sel[cat.key] == null} onClick={() => choose(cat.key, null)} label="Yok" />
                )}
                {cat.options.map((opt) => (
                  <OptBtn
                    key={opt.id}
                    active={sel[cat.key] === opt.id}
                    onClick={() => choose(cat.key, opt.id)}
                    label={opt.label}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-gray-600">
            Parçalar ComfyUI ile üretilip <code>public/avatar/</code> altına eklenir; manifest&apos;e satır ekleyince burada otomatik çıkar.
          </p>
        </div>
      </div>
    </section>
  );
}

function OptBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1 text-xs transition ${
        active ? "border-neon-pink bg-accent-soft text-white" : "border-border bg-bg-soft text-gray-300 hover:border-neon-purple"
      }`}
    >
      {label}
    </button>
  );
}
