# Hoixi Panel (Next.js) — monorepo kökünden build edilir (context: repo kökü).
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .
RUN corepack prepare pnpm@9.15.9 --activate \
 && pnpm install --frozen-lockfile \
 && pnpm --filter @hoixi/db generate \
 && pnpm --filter @hoixi/dashboard build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@hoixi/dashboard", "start"]
