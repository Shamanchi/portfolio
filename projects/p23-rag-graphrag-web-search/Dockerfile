# p23-rag-graphrag-web-search - offline (no API, no network) GraphRAG web search
# multi-stage, non-root, slim runtime. Node 22 (LTS) alpine.
FROM node:22-alpine AS base
WORKDIR /app

# 1) deps with lockfile if present, tolerate its absence
COPY package.json package-lock.json* ./
RUN npm ci --silent || true

# 2) full source + copy, re-install to be safe
COPY . .
RUN npm ci --silent || true

# 3) slim runtime, non-root user, run verification (typecheck+tests)
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=base /app /app
USER app
ENV NODE_ENV=production
CMD ["sh", "-c", "npm run verify"]
