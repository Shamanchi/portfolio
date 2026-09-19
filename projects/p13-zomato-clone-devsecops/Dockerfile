FROM node:24-alpine
WORKDIR /srv

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY static ./static

EXPOSE 8080
CMD ["node", "src/cli.ts", "--serve", "8080"]