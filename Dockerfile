# Build browser assets. This image does not contain Backend/Bot/database code.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ARG VITE_MINIAPP_API_URL=/api
ARG RAILWAY_GIT_COMMIT_SHA
RUN VITE_API_URL="$VITE_API_URL" VITE_MINIAPP_API_URL="$VITE_MINIAPP_API_URL" RAILWAY_GIT_COMMIT_SHA="$RAILWAY_GIT_COMMIT_SHA" npm run build

# Static assets and public reverse proxy only; all business APIs are external.
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts/serve.mjs ./scripts/serve.mjs
USER node
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]
