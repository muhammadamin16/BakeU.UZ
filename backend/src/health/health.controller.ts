import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({
    summary: "Проверка работы HTTP сервера без обращения к базе",
  })
  live() {
    return { status: "ok", service: "bakeu-backend", version: "0.1.0" };
  }

  @Get("live")
  @ApiOperation({ summary: "Liveness: HTTP процесс работает" })
  liveness() {
    return this.live();
  }

  @Get("ready")
  @ApiOperation({
    summary: "Readiness: PostgreSQL доступен и начальная миграция применена",
  })
  @ApiResponse({ status: 503, description: "База или схема недоступна" })
  async readiness() {
    if (!(await this.database.isReady()))
      throw new ServiceUnavailableException({
        status: "not_ready",
        database: "unavailable",
      });
    return { status: "ready", database: "connected" };
  }
}
