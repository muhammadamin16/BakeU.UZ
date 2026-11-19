FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
# Railway injects PORT at runtime. Do not set API_PORT=3001 in production.
EXPOSE 3001
# Use Mini App mode by default, with MINI_APP_URL from Railway Variables.
CMD ["node", "index.js", "--miniapp"]
