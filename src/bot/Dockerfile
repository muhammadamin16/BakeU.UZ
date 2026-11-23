FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data /data && chown node:node /app/data /data
# Runtime mounts can replace /data with a root-owned volume. index.js performs
# a narrowly scoped ownership repair, then drops to node BEFORE opening SQLite
# or contacting Telegram. This also covers Railway's custom npm start command.
ENV BAKEU_SQLITE_BOOTSTRAP=true
USER root
# Railway injects PORT at runtime. Do not set API_PORT=3001 in production.
EXPOSE 3001
# Use Mini App mode by default, with MINI_APP_URL from Railway Variables.
CMD ["node", "index.js", "--miniapp"]
