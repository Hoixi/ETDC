# Hoixi — Discord Bot + Yönetim Paneli

100 kişilik özel bir oyun/arkadaş sunucusu için sosyal, etkileşimli Discord botu ve
yöneticilerin tarayıcıdan kullanacağı web paneli. Monorepo (pnpm workspaces).

Domain: **enterthedarkcarnival.com** · Panel: `panel.enterthedarkcarnival.com`

## Yapı

```
apps/bot         discord.js v14 botu (TypeScript, ESM)
apps/dashboard   Next.js yönetim paneli           (Milestone 5+)
packages/db      Prisma şeması + paylaşılan client (bot ve panel ortak kullanır)
```

## Teknoloji kararları

| Konu          | Seçim                                                      |
| ------------- | --------------------------------------------------------- |
| Veritabanı    | **PostgreSQL** (Prisma)                                    |
| XP kaynağı    | **Mesaj + sesli kanal süresi**                            |
| Müzik         | **Harici müzik botu** (YouTube datacenter-IP bloğu nedeniyle Lavalink kaldırıldı) |
| Kick bildirimi| Sonraki sürüm (modül izole)                               |

## İlk kurulum (geliştirme)

Gereksinimler: Node ≥ 20, pnpm, Docker (Postgres için).

```bash
# 1) Ortam değişkenleri
cp .env.example .env        # DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID'yi doldur

# 2) Bağımlılıklar
pnpm install

# 3) Postgres'i ayağa kaldır
docker compose up -d postgres

# 4) Veritabanı şemasını uygula + Prisma client üret
pnpm db:migrate             # ilk seferde migration adı sorar (örn. "init")
pnpm db:generate

# 5) Slash command'ları register et
pnpm bot:deploy

# 6) Botu çalıştır
pnpm bot:dev
```

Discord Developer Portal'da botu davet ederken **gerekli intent'ler**:
`SERVER MEMBERS` ve `MESSAGE CONTENT` (Bot ayarlarından "Privileged Gateway Intents").

## Faydalı komutlar

```bash
pnpm bot:dev       # botu watch modda çalıştır
pnpm bot:deploy    # slash command register (GUILD_ID varsa anında)
pnpm db:migrate    # şema değişikliğini migration olarak uygula
pnpm db:studio     # Prisma Studio (DB görsel arayüz)
pnpm typecheck     # tüm paketlerde tip kontrolü
```

## Buton rol panelini test et (Milestone 2)

Bot çalışırken, sunucuda (Manage Server yetkisiyle):

```
/rolepanel demo kanal:#roller mod:TOGGLE rol1:@Kırmızı rol2:@Yeşil baslik:Renk Seç
/rolepanel liste                      # panelleri ve ID'lerini gör
/rolepanel yenile panel_id:<id>       # mesajı DB'deki son haline göre güncelle
/rolepanel sil panel_id:<id>          # paneli mesajıyla sil
```

Butona basınca rol verilir/alınır (ephemeral geri bildirim). Bot kendi rolünü,
atadığı rollerin **üstüne** taşımalı — yoksa "atanamıyor" uyarısı görürsün.

## Panel (Yönetim Paneli)

Next.js paneli `apps/dashboard`. Discord OAuth ile giriş, sadece **Sunucuyu Yönet**
yetkin olan sunucular görünür. Ekranlar: Rol Mesajı Builder (uçtan uca, canlı önizleme),
Karşılama, Level (+ödül rolleri), Loglama, Kick Yayın Bildirimi, Ayarlar.

```bash
# Local panel geliştirme (bot ayrı terminalde çalışırken):
pnpm --filter @hoixi/dashboard dev    # http://localhost:3000
```

Panel canlı Discord aksiyonlarını (kanal/rol listesi, rol oluştur, panel yayınla,
welcome önizleme) botun **iç API**'si üzerinden yapar (Fastify, sadece localhost/docker
network, `INTERNAL_API_KEY` ile korumalı). Saf config DB'ye yazılır, bot cache'i tazelenir.

> Discord OAuth için redirect URI'yi Developer Portal'a ekle:
> `https://panel.enterthedarkcarnival.com/api/auth/callback/discord`
> (local test için `http://localhost:3000/api/auth/callback/discord`).

## Deployment (Hetzner, Docker Compose)

```bash
# DNS: panel.enterthedarkcarnival.com A kaydı -> sunucu IP'si
cp .env.example .env          # tüm secret'ları doldur (INTERNAL_API_KEY uzun random)

docker compose up -d          # postgres + bot + dashboard + caddy
```

`bot` container'ı açılışta şemayı uygular (`prisma db push`). Caddy otomatik HTTPS alır.
İç API portları **dışarı açılmaz** (sadece docker network).

## Build sırası (milestone'lar)

1. ✅ İskelet: monorepo, Prisma, bot login + `/ping`, slash register
2. ✅ Buton rol sistemi (TOGGLE / UNIQUE / ADD_ONLY / VERIFY) + `/rolepanel`
3. ✅ Resimli Welcome/Goodbye (`@napi-rs/canvas`) + `/welcome`
4. ✅ XP/level (mesaj + sesli) + `/rank` + `/leaderboard` + ödül rolleri + `/level`
5. ✅ Panel auth (Discord OAuth + yetki gating)
6. ✅ Rol Mesajı Builder (panelden uçtan uca, canlı önizleme) — projenin kalbi
7. ✅ Welcome/Levels/Logging/Music/Streams ekranları
8. ✅ Moderasyon (`/kick /ban /timeout /clear /warn /warnings`) + log
9. ⬜ Müzik — Lavalink kuruldu ama YouTube'un datacenter-IP bloğu (oauth dahil tutarsız) nedeniyle **kaldırıldı**; müzik harici bir bota devredildi.
10. ✅ Kick yayın bildirimi (izole `streams/` modülü) + `/yayin`

> Secret'lar repoya girmez. `.env` `.gitignore`'da; sadece `.env.example` commit'lenir.
