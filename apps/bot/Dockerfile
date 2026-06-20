# Hoixi Bot — monorepo kökünden build edilir (context: repo kökü).
FROM node:22-bookworm-slim

# openssl: Prisma için. fontconfig + dejavu: canvas kart metinleri için.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl fontconfig fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .
RUN corepack prepare pnpm@9.15.9 --activate \
 && pnpm install --frozen-lockfile \
 && pnpm --filter @hoixi/db generate

ENV NODE_ENV=production

# Şemayı DB'ye uygula (db push — migration dosyası gerektirmez), sonra botu başlat
# (tsx ile — workspace TS import'ları için).
CMD ["sh", "-c", "pnpm --filter @hoixi/db exec prisma db push --skip-generate && pnpm --filter @hoixi/db exec prisma db execute --schema ./prisma/schema.prisma --file ./prisma/remap-slots.sql && pnpm --filter @hoixi/bot start"]
