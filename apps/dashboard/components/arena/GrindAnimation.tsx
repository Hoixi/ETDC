"use client";

import { useEffect, useState } from "react";

// /kas aktifken: oyuncunun canavarlarla savaştığı animasyon + geri sayım.
// Harici asset yok; emoji + CSS keyframe. Asset istenirse kolayca değiştirilebilir.
const MONSTERS = ["👹", "🤡", "🃏", "🕷️", "👺", "🎭"];

function fmt(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function GrindAnimation({
  endsAt, collected, stage,
}: { endsAt: number | null; collected: boolean; stage: number }) {
  const [now, setNow] = useState(() => Date.now());
  const [mob, setMob] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const m = setInterval(() => setMob((i) => (i + 1) % MONSTERS.length), 2200);
    return () => { clearInterval(t); clearInterval(m); };
  }, []);

  // Durum: kasmıyor / kasıyor / ganimet hazır
  const active = endsAt != null && !collected;
  const ready = active && endsAt! <= now;
  const grinding = active && endsAt! > now;

  if (!active) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-bg-card/60 px-4 py-3 text-sm text-gray-400">
        💤 Şu an kasmıyorsun. Discord&apos;da <code className="text-neon-pink">/kas</code> yazıp{" "}
        <strong>Stage {stage}</strong> için ganimet toplamaya başla.
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-neon-pink/40 bg-bg-card shadow-neon">
      <div className="grind-scene relative h-28 sm:h-32">
        {/* zemin parıltısı */}
        <div className="grind-floor" />
        {/* oyuncu */}
        <div className="grind-hero">🤺</div>
        {/* clash */}
        {grinding && <div className="grind-clash">⚔️</div>}
        {/* canavar */}
        <div className="grind-mob">{ready ? "💀" : MONSTERS[mob]}</div>
        {/* hasar sayıları */}
        {grinding && (
          <>
            <div className="grind-dmg grind-dmg-1">-{37 + stage * 3}</div>
            <div className="grind-dmg grind-dmg-2">-{52 + stage * 4}</div>
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 text-center text-sm">
        {grinding ? (
          <span className="text-gray-300">
            🎪 <strong className="text-neon-pink">Stage {stage}</strong> canavarlarını eşeliyorsun…{" "}
            kalan süre <strong className="font-mono text-neon-gold">{fmt(endsAt! - now)}</strong>
          </span>
        ) : (
          <span className="text-neon-gold">
            🎁 Ganimet hazır! Discord&apos;da <code className="text-neon-pink">/topla</code> ile al — bakalım kaç stage ilerledin.
          </span>
        )}
      </div>

      <style jsx>{`
        .grind-scene {
          background: radial-gradient(ellipse at 50% 120%, rgba(255, 46, 151, 0.18), transparent 60%),
            linear-gradient(180deg, #140a1f, #0b0712);
        }
        .grind-floor {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 28%;
          background: linear-gradient(180deg, transparent, rgba(166, 77, 255, 0.18));
        }
        .grind-hero, .grind-mob {
          position: absolute;
          bottom: 18%;
          font-size: 2.6rem;
          filter: drop-shadow(0 0 8px rgba(255, 46, 151, 0.5));
        }
        .grind-hero {
          left: 14%;
          animation: hero-lunge 1.1s ease-in-out infinite;
        }
        .grind-mob {
          right: 14%;
          animation: mob-hit 1.1s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(166, 77, 255, 0.6));
        }
        .grind-clash {
          position: absolute;
          left: 50%; bottom: 30%;
          transform: translateX(-50%);
          font-size: 1.8rem;
          animation: clash 1.1s ease-in-out infinite;
        }
        .grind-dmg {
          position: absolute;
          right: 20%;
          font-weight: 700;
          color: #ffc83d;
          text-shadow: 0 0 6px rgba(255, 200, 61, 0.8);
          opacity: 0;
        }
        .grind-dmg-1 { animation: float-dmg 1.6s ease-out infinite; }
        .grind-dmg-2 { animation: float-dmg 1.6s ease-out infinite 0.8s; }
        @keyframes hero-lunge {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          45% { transform: translateX(38px) rotate(8deg); }
          55% { transform: translateX(30px) rotate(6deg); }
        }
        @keyframes mob-hit {
          0%, 40%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(14px) scale(0.9) rotate(-6deg); }
          60% { transform: translateX(8px) scale(0.95); }
        }
        @keyframes clash {
          0%, 40%, 100% { opacity: 0; transform: translateX(-50%) scale(0.6); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.3) rotate(20deg); }
        }
        @keyframes float-dmg {
          0% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-34px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .grind-hero, .grind-mob, .grind-clash, .grind-dmg { animation: none; }
          .grind-clash, .grind-dmg { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
