# Fase 1: Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Fase 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Desabilita telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Variáveis fictícias para satisfazer a validação do Zod durante o build (as reais são injetadas em runtime)
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pedidos"
ENV R2_URL="https://dummy.r2.cloudflarestorage.com"
ENV R2_PUBLIC_URL="https://pub-dummy.r2.dev"
ENV R2_ACCESS_KEY_ID="dummy"
ENV R2_SECRET_ACCESS_KEY="dummy"

RUN npm run build

# Fase 3: Runner (Produção)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Cria diretórios necessários com permissões adequadas para o usuário não-root
RUN mkdir -p .next /tmp/uploads && chown -R nextjs:nodejs .next /tmp/uploads

# Copia do builder usando o modo standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
