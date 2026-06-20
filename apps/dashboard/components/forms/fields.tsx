"use client";

import type { ApiChannel, ApiRole } from "@/lib/botApi";

export function ChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: ApiChannel[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— seç —</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          #{ch.name}
        </option>
      ))}
    </select>
  );
}

export function RoleSelect({
  roles,
  value,
  onChange,
  placeholder = "— herkes —",
}: {
  roles: ApiRole[];
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
