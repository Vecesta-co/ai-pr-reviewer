# Multi-stage build for lightweight execution
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci

COPY src ./src
RUN npm run build && npm prune --production

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install git for diff parsing
RUN apk add --no-cache git

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["review"]
