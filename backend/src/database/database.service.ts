import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: NodePgDatabase<typeof schema>;
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>("DATABASE_URL"),
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 10000,
      max: 10,
    });
    // Idle pool failures must not crash the HTTP process. Readiness reports outages.
    this.pool.on("error", () => {});
    this.db = drizzle(this.pool, { schema });
  }

  async isReady(): Promise<boolean> {
    try {
      await this.db.select({ id: schema.users.id }).from(schema.users).limit(1);
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
