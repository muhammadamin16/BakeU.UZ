import "reflect-metadata";
import { ForbiddenException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

export async function createApplication(options: { logger?: false } = {}) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...options,
    abortOnError: false,
  });
  const config = app.get(ConfigService);
  const origins = config.getOrThrow<string[]>("CORS_ORIGINS");
  app.setGlobalPrefix("api/v1");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests":
            config.get<string>("NODE_ENV") === "production" ? [] : null,
        },
      },
    }),
  );
  app.useBodyParser("json", { limit: "256kb" });
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      if (!origin || origins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException("Origin is not allowed."), false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  if (config.getOrThrow<boolean>("ENABLE_API_DOCS")) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("BakeU API")
        .setDescription(
          "Backend foundation: health and database readiness. Business endpoints are not implemented yet.",
        )
        .setVersion("0.1.0")
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document, {
      jsonDocumentUrl: "/api/openapi.json",
    });
  }
  app.enableShutdownHooks();
  return app;
}
