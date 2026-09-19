FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent || true
COPY . .
RUN npm ci --silent || true

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=base /app /app
USER app
ENV NODE_ENV=production
CMD ["sh", "-c", "npm run verify"]
