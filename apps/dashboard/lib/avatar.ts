// Modüler full-body avatar manifest'i + seçim doğrulama.
// Katmanlar 1024×1024, aynı anchor; z-sırasına göre üst üste bindirilir.
// Dosyalar public/avatar/<kategori>/ altında (uzantı bağımsız — placeholder .svg, gerçek .png).
// Yeni asset eklemek = ilgili kategoriye option satırı + dosyayı koymak.

export interface AvatarOption {
  id: string;
  label: string;
  file: string; // public-relative yol
}

export interface AvatarCategory {
  key: string;
  label: string;
  z: number; // çizim sırası (küçük = altta)
  optional?: boolean; // "yok" seçilebilir mi (null)
  options: AvatarOption[];
}

const f = (cat: string, id: string) => `/avatar/${cat}/${id}.svg`;

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    key: "body", label: "Gövde", z: 0,
    options: [
      { id: "body-01", label: "Ten 1", file: f("body", "body-01") },
      { id: "body-02", label: "Ten 2", file: f("body", "body-02") },
    ],
  },
  {
    key: "outfit", label: "Kıyafet", z: 10,
    options: [
      { id: "outfit-01", label: "Cambaz", file: f("outfit", "outfit-01") },
      { id: "outfit-02", label: "Palyaço", file: f("outfit", "outfit-02") },
    ],
  },
  {
    key: "face", label: "Yüz", z: 20,
    options: [
      { id: "face-01", label: "Sırıtış", file: f("face", "face-01") },
      { id: "face-02", label: "Asık", file: f("face", "face-02") },
    ],
  },
  {
    key: "hair", label: "Saç", z: 30,
    options: [
      { id: "hair-01", label: "Kıvırcık", file: f("hair", "hair-01") },
      { id: "hair-02", label: "Dağınık", file: f("hair", "hair-02") },
    ],
  },
  {
    key: "headwear", label: "Başlık", z: 40, optional: true,
    options: [
      { id: "headwear-01", label: "Şapka", file: f("headwear", "headwear-01") },
      { id: "headwear-02", label: "Maske", file: f("headwear", "headwear-02") },
    ],
  },
];

export const AVATAR_BY_KEY = Object.fromEntries(AVATAR_CATEGORIES.map((c) => [c.key, c]));

export type AvatarSelection = Record<string, string | null>;

// Ham JSON'u doğrula: bilinmeyen id'leri at, zorunlu kategorilere ilk seçeneği varsayılan yap.
export function parseAvatar(raw: unknown): AvatarSelection {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sel: AvatarSelection = {};
  for (const cat of AVATAR_CATEGORIES) {
    const val = o[cat.key];
    const valid = typeof val === "string" && cat.options.some((opt) => opt.id === val);
    if (valid) sel[cat.key] = val as string;
    else sel[cat.key] = cat.optional ? null : cat.options[0].id;
  }
  return sel;
}

// Seçili kategorilerin geçerli olduğunu doğrula (API kaydı için).
export function isValidSelection(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    const cat = AVATAR_BY_KEY[k];
    if (!cat) return false;
    if (v === null) {
      if (!cat.optional) return false;
    } else if (typeof v !== "string" || !cat.options.some((opt) => opt.id === v)) {
      return false;
    }
  }
  return true;
}

// Z-sırasına göre çizilecek katman dosyaları (null/eksik atlanır).
export function avatarLayers(sel: AvatarSelection): { key: string; file: string; z: number }[] {
  return AVATAR_CATEGORIES
    .map((cat) => {
      const id = sel[cat.key];
      if (!id) return null;
      const opt = cat.options.find((o) => o.id === id);
      return opt ? { key: cat.key, file: opt.file, z: cat.z } : null;
    })
    .filter((x): x is { key: string; file: string; z: number } => x !== null)
    .sort((a, b) => a.z - b.z);
}
