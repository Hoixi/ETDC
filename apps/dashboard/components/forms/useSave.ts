"use client";

import { useState } from "react";

export interface SaveMsg {
  type: "ok" | "err";
  text: string;
}

export function useSave() {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<SaveMsg | null>(null);

  async function run(fn: () => Promise<void>, okText = "Kaydedildi ✓") {
    setSaving(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ type: "ok", text: okText });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return { saving, msg, run, setMsg };
}
