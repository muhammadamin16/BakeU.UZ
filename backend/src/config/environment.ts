export class ConfigurationError extends Error {}

const developmentOrigins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:4300",
  "http://localhost:4300",
  "https://localhost",
  "capacitor://localhost",
];

export function validateEnvironment(input: Record<string, unknown>) {
  const environment = String(input.NODE_ENV || "development");
  if (!["development", "test", "production"].includes(environment))
    throw new ConfigurationError(
      "NODE_ENV: используйте development, test или production.",
    );
  const host = String(input.API_HOST || "127.0.0.1");
  if (!/^[a-zA-Z0-9.:-]+$/.test(host))
    throw new ConfigurationError(
      "API_HOST: укажите адрес без протокола и пути.",
    );
  const portText = String(input.API_PORT ?? "4000");
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535)
    throw new ConfigurationError(
      "API_PORT: укажите целое число от 1 до 65535.",
    );
  const databaseUrl = String(input.DATABASE_URL || "");
  try {
    const url = new URL(databaseUrl);
    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw Error();
  } catch {
    throw new ConfigurationError(
      "DATABASE_URL: нужен PostgreSQL URL. Скопируйте .env.example в .env и настройте подключение.",
    );
  }
  if (environment === "production" && !String(input.CORS_ORIGINS || "").trim())
    throw new ConfigurationError(
      "CORS_ORIGINS: в production укажите точные разрешённые origins.",
    );
  const origins = [
    ...new Set(
      String(input.CORS_ORIGINS || developmentOrigins.join(","))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (!origins.length)
    throw new ConfigurationError(
      "CORS_ORIGINS: укажите хотя бы один точный origin.",
    );
  for (const origin of origins) {
    if (origin === "capacitor://localhost") continue;
    try {
      const url = new URL(origin);
      if (
        origin.includes("*") ||
        !["http:", "https:"].includes(url.protocol) ||
        url.origin !== origin ||
        url.username ||
        url.password
      )
        throw Error();
    } catch {
      throw new ConfigurationError(
        "CORS_ORIGINS: используйте точные HTTP(S) origins без *, путей и завершающего /.",
      );
    }
  }
  const docs = String(
    input.ENABLE_API_DOCS ?? (environment === "production" ? "false" : "true"),
  );
  if (!["true", "false"].includes(docs))
    throw new ConfigurationError(
      "ENABLE_API_DOCS: используйте true или false.",
    );
  return {
    NODE_ENV: environment,
    API_HOST: host,
    API_PORT: port,
    DATABASE_URL: databaseUrl,
    CORS_ORIGINS: origins,
    ENABLE_API_DOCS: docs === "true",
  };
}
