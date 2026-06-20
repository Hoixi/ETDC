# Hoixi — Coolify ile Deployment

Coolify, kodu Git'ten klonlayıp `docker-compose.coolify.yml`'deki Dockerfile'larla build eder.
Kendi reverse-proxy'si (Traefik) HTTPS'i otomatik aldığı için **Caddy kullanmıyoruz**.

## 1. Ön hazırlık

- **DNS:** `panel.enterthedarkcarnival.com` için **A kaydı** → Coolify sunucunun IP'si.
- **Discord Developer Portal → OAuth2 → Redirects**'e ekle:
  `https://panel.enterthedarkcarnival.com/api/auth/callback/discord`
- Kod bir Git deposunda olmalı (GitHub/GitLab). Coolify build için repoyu klonlar.

## 2. Coolify'da resource oluştur

1. **+ New Resource → Private Repository (with GitHub App)** (veya Public/Deploy Key).
2. Repoyu ve branch'i (`main`) seç.
3. **Build Pack: Docker Compose**.
4. **Docker Compose Location:** `/docker-compose.coolify.yml`
5. Deploy etmeden önce environment ve domain'i ayarla (aşağıda).

## 3. Environment Variables (Coolify → Environment Variables)

Değerleri **local `.env` dosyandan kopyala** (bu repoya hiç girmez). Gerekli olanlar:

| Değişken | Açıklama |
|----------|----------|
| `POSTGRES_PASSWORD` | DB şifresi (güçlü bir değer seç) |
| `DISCORD_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Uygulama/Client ID |
| `DISCORD_CLIENT_SECRET` | Client Secret |
| `GUILD_ID` | (opsiyonel) test sunucu ID — boşsa global register |
| `LAVALINK_PASSWORD` | Lavalink şifresi (`.env`'de üretildi) |
| `INTERNAL_API_KEY` | Bot iç API anahtarı (`.env`'de üretildi) |
| `SESSION_SECRET` | Panel oturum secret'ı (`.env`'de üretildi) |
| `NEXTAUTH_URL` | `https://panel.enterthedarkcarnival.com` |
| `SPOTIFY_CLIENT_ID` | (opsiyonel) Spotify metadata |
| `SPOTIFY_CLIENT_SECRET` | (opsiyonel) |

> Not: `DATABASE_URL` ve `BOT_API_URL` compose içinde otomatik kuruluyor (`postgres` / `bot`
> servis adlarıyla), ayrıca girmene gerek yok.

## 4. Domain ata

Compose deploy edilince Coolify servisleri listeler. **`dashboard`** servisine:
- Domain: `https://panel.enterthedarkcarnival.com`
- Port: `3000`

Diğer servislere (postgres, bot, lavalink) **domain verme** — onlar sadece iç network'te.

## 5. Deploy

**Deploy**'a bas. İlk build birkaç dakika sürer (pnpm install + next build). Sıra:
1. `postgres` healthy olur.
2. `bot` açılışta `prisma migrate deploy` çalıştırır, sonra başlar (iç API :3001).
3. `dashboard` ayağa kalkar, Coolify HTTPS sertifikasını alır.

## 6. Slash komutları kaydet

Komutlar otomatik register **edilmez**. Bir kez çalıştır (lokalden, prod env ile veya
Coolify'da bot container terminalinden):

```bash
pnpm bot:deploy
```

GUILD_ID set'liyse komutlar o sunucuda anında, değilse global (~1 saat) görünür.

## 7. Müzik (Lavalink)

`lavalink` servisi `application.yml`'deki plugin'leri (youtube-source + LavaSrc) açılışta
Maven'den **otomatik indirir**. Spotify metadata için `SPOTIFY_CLIENT_ID/SECRET` gir.

## Güncelleme

Repoya push → Coolify otomatik (webhook) ya da manuel **Redeploy**. Migration'lar bot
açılışında tekrar uygulanır (idempotent).
