FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Railway provides these during build. Never pass service/database secrets here.
ARG VITE_GO_API_URL=/api
ARG VITE_ACCOUNT_API_URL=/api
ARG VITE_GO_PHONE_ACCOUNTS=false
ENV VITE_GO_API_URL=$VITE_GO_API_URL VITE_ACCOUNT_API_URL=$VITE_ACCOUNT_API_URL VITE_GO_PHONE_ACCOUNTS=$VITE_GO_PHONE_ACCOUNTS
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts/website-server.mjs ./scripts/website-server.mjs
USER node
EXPOSE 8080
CMD ["node", "scripts/website-server.mjs"]
