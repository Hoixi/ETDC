import { avatarLayers, type AvatarSelection } from "@/lib/avatar";

// Seçili katmanları z-sırasına göre üst üste bindirip karakteri çizer.
// public/avatar/* altındaki dosyalar (uzantı bağımsız: placeholder .svg, gerçek .png).
export function AvatarView({ selection, className = "" }: { selection: AvatarSelection; className?: string }) {
  const layers = avatarLayers(selection);
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      {layers.map((l) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={l.key}
          src={l.file}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ))}
    </div>
  );
}
