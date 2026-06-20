# Hoixi — Claude Code notları

Bu, `hoixi-bot-spec.md` brief'ine göre kurulan monorepo. Spec'in tamamı
`C:\Users\Furkan\Desktop\hoixi-bot-spec.md` dosyasında.

## Sabitlenen kararlar (kullanıcıyla netleştirildi)

- **DB:** PostgreSQL (Prisma). SQLite kullanma.
- **XP:** mesaj **+ sesli kanal süresi**.
- **Müzik:** YouTube + **Spotify metadata** (Lavalink youtube-source + LavaSrc). Sesi YouTube'dan çeker.
- **Kick bildirimi:** ilk sürümde yok, sonraya bırakıldı (izole modül).
- **Domain:** enterthedarkcarnival.com · panel: panel.enterthedarkcarnival.com
- **Carl-bot:** hiçbir migration/uyumluluk yok. Temiz başlangıç.

## Çalışma tarzı

- Türkçe yorum yaz. Kullanıcıya görünen tüm metinler **Türkçe**.
- Big-bang yapma; milestone sırasına göre ilerle (README'deki liste), her milestone
  sonunda çalışır halde dur ve test et.
- Her feature kendi `apps/bot/src/features/<ad>/` modülünde izole olsun (söküp takılabilir).
- Over-engineer etme ama temiz/genişletilebilir kur.

## Teknik notlar

- ESM + TypeScript. discord.js v14. Node ≥ 20, pnpm.
- Komut/event'ler `apps/bot/src/{commands,events}/` altına dosya bırakılınca otomatik
  yüklenir (`src/lib/loaders.ts`). Yeni komut = yeni dosya, `default` export `Command`.
- Buton rol customId formatı: `role:<panelId>:<buttonId>` (persistent router, `interactionCreate`).
- Env doğrulaması `apps/bot/src/config.ts` (zod). Kök `.env`'den okur.
- Paylaşılan Prisma client: `import { prisma } from "@hoixi/db"`.
- pnpm kullanıcı dizinine kuruldu: `%LOCALAPPDATA%\npm-global` (PATH'e eklendi).
- **Prod'da bot `tsx` ile çalışır** (`node dist` değil). Sebep: `@hoixi/db` workspace paketi
  TS olarak export ediyor; `tsx` hem dev hem prod'da TS import'larını çözüyor. `build` (tsc)
  sadece typecheck/emit doğrulaması için.
- Panel ↔ bot: dashboard `lib/botApi.ts` → bot Fastify `src/api/server.ts` (x-internal-key).
  Config DB'ye yazılır, sonra `/config/invalidate` ile bot cache tazelenir.
- **Tüm milestone'lar (1-10) tamamlandı.** 25 slash komut, panel uçtan uca çalışır.
  Gerçek Discord/Lavalink testi token + çalışan Docker gerektirir (kullanıcı tarafında).

## Güvenlik (spec bölüm 8 — ihmal etme)

- Bot iç API sadece localhost/docker network, `INTERNAL_API_KEY` header'lı.
- Panelde her aksiyon öncesi guild yetkisini tekrar doğrula (sadece login yetmez).
- Embed/label girdilerini sanitize et, `allowedMentions` ayarla (mention injection).
- Raw SQL yok, Prisma. Lavalink portu dışarı açma.
