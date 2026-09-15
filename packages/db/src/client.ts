import { SQL } from "bun";
import { drizzle, type BunSQLDatabase } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index.js";

type Database = BunSQLDatabase<typeof schema>;

interface DatabaseClient {
  db: Database;
  checkConnection: (signal?: AbortSignal) => Promise<void>;
  close: () => Promise<void>;
  connect: () => Promise<void>;
}

interface CreateDatabaseOptions {
  connectionString: string;
  shutdownTimeoutSeconds?: number;
}

function createDatabase(options: CreateDatabaseOptions): DatabaseClient {
  const sql = new SQL(options.connectionString);
  const db = drizzle({ client: sql, schema });
  const shutdownTimeoutSeconds = options.shutdownTimeoutSeconds ?? 5;

  return {
    checkConnection: async (signal) => {
      await sql`SELECT 1`;

      if (signal?.aborted) {
        throw signal.reason;
      }
    },
    close: () => sql.close({ timeout: shutdownTimeoutSeconds }),
    connect: async () => {
      await sql.connect();
    },
    db,
  };
}

export { createDatabase, type Database, type DatabaseClient };
