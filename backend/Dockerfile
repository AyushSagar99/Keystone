FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev \
  && npm install prisma@5.22.0 --no-save \
  && npx prisma generate \
  && npm uninstall prisma

COPY --from=builder /app/dist ./dist

EXPOSE 5566

CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy && node dist/main.js"]
