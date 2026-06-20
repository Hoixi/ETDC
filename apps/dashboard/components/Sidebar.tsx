"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { slug: "", label: "Genel Bakış", icon: "🏠" },
  { slug: "roles", label: "Rol Mesajları", icon: "🎭" },
  { slug: "welcome", label: "Karşılama", icon: "👋" },
  { slug: "levels", label: "Level", icon: "⭐" },
  { slug: "logging", label: "Loglama", icon: "📋" },
  { slug: "streams", label: "Yayın Bildirimi", icon: "🔴" },
  { slug: "settings", label: "Ayarlar", icon: "⚙️" },
];

export function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const href = item.slug ? `${base}/${item.slug}` : base;
        const active = item.slug ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={item.slug}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-accent text-white" : "text-gray-300 hover:bg-bg-hover"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
