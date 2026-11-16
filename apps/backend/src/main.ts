import { ConfigService } from "@nestjs/config";
import { createApplication } from "./bootstrap";
import { ConfigurationError } from "./config/environment";

async function main() {
  const app = await createApplication();
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>("API_PORT");
  const host = config.getOrThrow<string>("API_HOST");
  await app.listen(port, host);
  const address = await app.getUrl();
  console.log("BakeU API: " + address + "/api/v1/health/live");
  if (config.get<boolean>("ENABLE_API_DOCS"))
    console.log("API docs: " + address + "/api/docs");
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : "Backend startup failed. Check the port, .env settings and installed dependencies.",
  );
  process.exitCode = 1;
});
