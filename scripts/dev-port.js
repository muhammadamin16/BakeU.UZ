import { createServer } from "node:net";

export function readDevPort(value) {
  const raw = String(
    value === undefined || value === null || value === "" ? "5173" : value,
  ).trim();
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("VITE_DEV_PORT должен быть целым числом от 1 до 65535.");
  return port;
}

export function probeDevPort(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen({ port, host }, () =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
}

export async function selectDevPort(requested, host, probe = probeDevPort) {
  const alternatives = [
    3000,
    ...Array.from({ length: 19 }, (_, i) => 3002 + i),
  ];
  let reason;
  for (const port of [...new Set([requested, ...alternatives])]) {
    try {
      await probe(port, host);
      return { port, reason };
    } catch (error) {
      if (!["EACCES", "EPERM", "EADDRINUSE"].includes(error.code)) throw error;
      reason ||= error.code;
    }
  }
  throw Error(
    "Не найден доступный порт для Vite. Укажите VITE_DEV_PORT в .env.local или освободите выбранный порт.",
  );
}

export function devPortPlugin() {
  let fallback;
  return {
    name: "bakeu-dev-port",
    async config(config, environment) {
      fallback = undefined;
      if (
        environment.command !== "serve" ||
        environment.isPreview ||
        config.server?.middlewareMode ||
        config.server?.strictPort
      )
        return;
      const requested = readDevPort(config.server?.port);
      const host =
        typeof config.server?.host === "string"
          ? config.server.host
          : "127.0.0.1";
      const selected = await selectDevPort(requested, host);
      if (selected.port !== requested) fallback = { ...selected, requested };
      // Do not let a later port race silently move Vite onto the API's port 3001.
      return { server: { port: selected.port, strictPort: true } };
    },
    configureServer(server) {
      if (fallback)
        server.config.logger.warn(
          "Порт " +
            fallback.requested +
            " недоступен (" +
            fallback.reason +
            "). Vite использует порт " +
            fallback.port +
            ". Откройте адрес Local ниже; свой порт можно задать через VITE_DEV_PORT в .env.local.",
        );
    },
  };
}
