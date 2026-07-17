# Build stage — full deps + next build (standalone output, ADR-0005)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Migration stage — full deps + drizzle files, run on the box against the
# compose-network Postgres (ADR-0008): compose --profile ops run migrate
FROM builder AS migrate
CMD ["npx", "tsx", "scripts/db-migrate.ts"]

# Runtime stage — only the standalone server + assets
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
