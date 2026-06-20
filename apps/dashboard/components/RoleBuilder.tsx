"use client";

import { useState } from "react";
import { postJSON, sendJSON } from "@/lib/clientApi";
import type { ApiChannel, ApiRole } from "@/lib/botApi";

type Mode = "TOGGLE" | "UNIQUE" | "ADD_ONLY" | "VERIFY";
type Style = "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER";

interface ButtonForm {
  roleId: string;
  label: string;
  emoji: string;
  style: Style;
}
interface PanelEmbed {
  title: string;
  description: string;
  color: string;
  image: string;
  thumbnail: string;
  footer: string;
}
interface PanelForm {
  id?: string;
  channelId: string;
  mode: Mode;
  messageId?: string | null;
  embed: PanelEmbed;
  buttons: ButtonForm[];
}

interface ApiPanel {
  id: string;
  channelId: string;
  mode: Mode;
  messageId: string | null;
  embed: Partial<PanelEmbed> | null;
  buttons: { roleId: string; label: string; emoji: string | null; style: Style; order: number }[];
}

const MODE_DESC: Record<Mode, string> = {
  TOGGLE: "Bas → ver, tekrar bas → al.",
  UNIQUE: "Grup içinde tek rol (renk rolleri için).",
  ADD_ONLY: "Sadece ekler, geri almaz.",
  VERIFY: "Tek buton, üye rolü verip kuralları onaylatır.",
};
const STYLE_HEX: Record<Style, string> = {
  PRIMARY: "#5865F2",
  SECONDARY: "#4e5058",
  SUCCESS: "#248046",
  DANGER: "#da373c",
};

const emptyPanel = (channelId: string): PanelForm => ({
  channelId,
  mode: "TOGGLE",
  embed: { title: "Rolleri Seç", description: "Aşağıdaki butonlarla rollerini yönet.", color: "#5865F2", image: "", thumbnail: "", footer: "" },
  buttons: [],
});

export function RoleBuilder({
  guildId,
  channels,
  roles: initialRoles,
  panels: initialPanels,
}: {
  guildId: string;
  channels: ApiChannel[];
  roles: ApiRole[];
  panels: ApiPanel[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [panels, setPanels] = useState<ApiPanel[]>(initialPanels);
  const [form, setForm] = useState<PanelForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "bilinmeyen rol";
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? "?";

  function startNew() {
    setMsg(null);
    setForm(emptyPanel(channels[0]?.id ?? ""));
  }
  function editPanel(p: ApiPanel) {
    setMsg(null);
    setForm({
      id: p.id,
      channelId: p.channelId,
      mode: p.mode,
      messageId: p.messageId,
      embed: {
        title: p.embed?.title ?? "",
        description: p.embed?.description ?? "",
        color: p.embed?.color?.toString() ?? "#5865F2",
        image: p.embed?.image ?? "",
        thumbnail: p.embed?.thumbnail ?? "",
        footer: p.embed?.footer ?? "",
      },
      buttons: p.buttons.sort((a, b) => a.order - b.order).map((b) => ({ roleId: b.roleId, label: b.label, emoji: b.emoji ?? "", style: b.style })),
    });
  }

  function patchEmbed(k: keyof PanelEmbed, v: string) {
    setForm((f) => (f ? { ...f, embed: { ...f.embed, [k]: v } } : f));
  }
  function patchButton(i: number, k: keyof ButtonForm, v: string) {
    setForm((f) => {
      if (!f) return f;
      const buttons = [...f.buttons];
      buttons[i] = { ...buttons[i], [k]: v } as ButtonForm;
      return { ...f, buttons };
    });
  }
  function addButton() {
    setForm((f) => (f && f.buttons.length < 25 ? { ...f, buttons: [...f.buttons, { roleId: roles[0]?.id ?? "", label: roles[0]?.name ?? "Rol", emoji: "", style: "SECONDARY" }] } : f));
  }
  function removeButton(i: number) {
    setForm((f) => (f ? { ...f, buttons: f.buttons.filter((_, j) => j !== i) } : f));
  }
  function moveButton(i: number, dir: -1 | 1) {
    setForm((f) => {
      if (!f) return f;
      const j = i + dir;
      if (j < 0 || j >= f.buttons.length) return f;
      const buttons = [...f.buttons];
      [buttons[i], buttons[j]] = [buttons[j], buttons[i]];
      return { ...f, buttons };
    });
  }

  async function createRole() {
    const name = window.prompt("Yeni rol adı?");
    if (!name) return;
    const color = window.prompt("Renk (hex, örn #ff0000)? Boş bırakılabilir.") ?? undefined;
    try {
      const role = await postJSON<ApiRole>(`/api/guilds/${guildId}/roles`, { name, color });
      setRoles((prev) => [role, ...prev]);
      // Son butona ata (varsa)
      setForm((f) => {
        if (!f || f.buttons.length === 0) return f;
        const buttons = [...f.buttons];
        buttons[buttons.length - 1] = { ...buttons[buttons.length - 1], roleId: role.id, label: buttons[buttons.length - 1].label || role.name };
        return { ...f, buttons };
      });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    }
  }

  async function refreshPanels() {
    const data = await fetch(`/api/guilds/${guildId}/panels`).then((r) => r.json());
    setPanels(data);
  }

  async function save(publish: boolean) {
    if (!form) return;
    if (!form.channelId) return setMsg({ type: "err", text: "Kanal seç." });
    if (form.buttons.length === 0) return setMsg({ type: "err", text: "En az 1 buton ekle." });
    if (form.buttons.some((b) => !b.roleId)) return setMsg({ type: "err", text: "Her butona bir rol seç." });

    setBusy(true);
    setMsg(null);
    try {
      const body = {
        channelId: form.channelId,
        mode: form.mode,
        embed: form.embed,
        buttons: form.buttons.map((b, i) => ({ ...b, emoji: b.emoji || null, order: i })),
      };
      const saved = form.id
        ? await sendJSON<ApiPanel>("PUT", `/api/guilds/${guildId}/panels/${form.id}`, body)
        : await postJSON<ApiPanel>(`/api/guilds/${guildId}/panels`, body);

      if (publish) {
        await postJSON(`/api/guilds/${guildId}/panels/${saved.id}/publish`, {});
      }
      await refreshPanels();
      setForm(null);
      setMsg({ type: "ok", text: publish ? "Panel yayınlandı ✓" : "Panel kaydedildi ✓" });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function publishExisting(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      await postJSON(`/api/guilds/${guildId}/panels/${id}/publish`, {});
      await refreshPanels();
      setMsg({ type: "ok", text: "Yayınlandı ✓" });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function deletePanel(id: string) {
    if (!window.confirm("Bu panel silinsin mi? (Discord mesajı da silinir)")) return;
    setBusy(true);
    try {
      await sendJSON("DELETE", `/api/guilds/${guildId}/panels/${id}`);
      setPanels((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Mevcut paneller */}
      {!form && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Paneller</h2>
            <button className="btn" onClick={startNew} disabled={channels.length === 0}>+ Yeni Panel</button>
          </div>
          {channels.length === 0 && (
            <div className="card mb-4 text-sm text-yellow-300">Bot çevrimdışı görünüyor — kanal/rol listesi çekilemedi. Botu başlat.</div>
          )}
          <div className="space-y-3">
            {panels.length === 0 && <div className="card text-sm text-gray-500">Henüz panel yok.</div>}
            {panels.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{p.embed?.title || "(başlıksız)"}</div>
                  <div className="text-xs text-gray-500">
                    #{channelName(p.channelId)} · {p.mode} · {p.buttons.length} buton · {p.messageId ? "yayında" : "taslak"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => editPanel(p)}>Düzenle</button>
                  <button className="btn" disabled={busy} onClick={() => publishExisting(p.id)}>{p.messageId ? "Güncelle" : "Yayınla"}</button>
                  <button className="btn-danger" disabled={busy} onClick={() => deletePanel(p.id)}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Editör */}
      {form && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="card">
              <h3 className="mb-3 font-semibold text-white">{form.id ? "Paneli Düzenle" : "Yeni Panel"}</h3>
              <div className="grid gap-3">
                <div>
                  <label className="label">Kanal</label>
                  <select className="input" value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })}>
                    {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Mod</label>
                  <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}>
                    {(["TOGGLE", "UNIQUE", "ADD_ONLY", "VERIFY"] as Mode[]).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{MODE_DESC[form.mode]}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 font-semibold text-white">Embed</h3>
              <div className="grid gap-3">
                <div><label className="label">Başlık</label><input className="input" value={form.embed.title} onChange={(e) => patchEmbed("title", e.target.value)} /></div>
                <div><label className="label">Açıklama</label><textarea className="input min-h-20" value={form.embed.description} onChange={(e) => patchEmbed("description", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Renk</label><input type="color" className="input h-10 p-1" value={form.embed.color} onChange={(e) => patchEmbed("color", e.target.value)} /></div>
                  <div><label className="label">Footer</label><input className="input" value={form.embed.footer} onChange={(e) => patchEmbed("footer", e.target.value)} /></div>
                </div>
                <div><label className="label">Büyük Görsel URL</label><input className="input" value={form.embed.image} onChange={(e) => patchEmbed("image", e.target.value)} /></div>
                <div><label className="label">Küçük Görsel (thumbnail) URL</label><input className="input" value={form.embed.thumbnail} onChange={(e) => patchEmbed("thumbnail", e.target.value)} /></div>
              </div>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-white">Butonlar ({form.buttons.length}/25)</h3>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={createRole}>+ Yeni Rol Oluştur</button>
                  <button className="btn" onClick={addButton} disabled={form.buttons.length >= 25}>+ Buton</button>
                </div>
              </div>
              <div className="space-y-3">
                {form.buttons.map((b, i) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-soft p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="label">Rol</label>
                        <select className="input" value={b.roleId} onChange={(e) => patchButton(i, "roleId", e.target.value)}>
                          <option value="">— seç —</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.assignable ? "" : " ⚠️"}</option>)}
                        </select>
                      </div>
                      <div><label className="label">Etiket</label><input className="input" value={b.label} onChange={(e) => patchButton(i, "label", e.target.value)} /></div>
                      <div><label className="label">Emoji</label><input className="input" value={b.emoji} placeholder="🟢 veya <:ad:id>" onChange={(e) => patchButton(i, "emoji", e.target.value)} /></div>
                      <div>
                        <label className="label">Stil</label>
                        <select className="input" value={b.style} onChange={(e) => patchButton(i, "style", e.target.value)}>
                          {(["PRIMARY", "SECONDARY", "SUCCESS", "DANGER"] as Style[]).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                      <button className="text-gray-400 hover:text-white" onClick={() => moveButton(i, -1)}>↑</button>
                      <button className="text-gray-400 hover:text-white" onClick={() => moveButton(i, 1)}>↓</button>
                      <button className="ml-auto text-red-400 hover:text-red-300" onClick={() => removeButton(i)}>Kaldır</button>
                    </div>
                  </div>
                ))}
                {form.buttons.length === 0 && <div className="text-sm text-gray-500">Buton ekle.</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn" disabled={busy} onClick={() => save(true)}>{busy ? "…" : "Kaydet & Yayınla"}</button>
              <button className="btn-ghost" disabled={busy} onClick={() => save(false)}>Sadece Kaydet</button>
              <button className="btn-ghost" onClick={() => setForm(null)}>Vazgeç</button>
            </div>
          </div>

          {/* Canlı önizleme */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-2 text-sm text-gray-400">Önizleme</div>
            <div className="rounded-lg bg-[#313338] p-4">
              <div className="flex gap-3 overflow-hidden rounded" style={{ borderLeft: `4px solid ${form.embed.color}`, background: "#2b2d31" }}>
                <div className="flex-1 p-3">
                  {form.embed.title && <div className="font-semibold text-white">{form.embed.title}</div>}
                  {form.embed.description && <div className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{form.embed.description}</div>}
                  {form.embed.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.embed.image} alt="" className="mt-2 max-h-40 rounded" />
                  )}
                  {form.embed.footer && <div className="mt-2 text-xs text-gray-500">{form.embed.footer}</div>}
                </div>
                {form.embed.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.embed.thumbnail} alt="" className="m-3 h-16 w-16 rounded object-cover" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.buttons.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-white" style={{ background: STYLE_HEX[b.style] }}>
                    {b.emoji} {b.label || roleName(b.roleId)}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">⚠️ işaretli roller botun rolünün üstünde — atanamaz, botun rolünü yukarı al.</p>
          </div>
        </div>
      )}
    </div>
  );
}
