import { Options, PopulateHint } from "@mikro-orm/core";
import { MySqlDriver } from "@mikro-orm/mysql";
import dotenv from "dotenv";
import { Migrator } from "@mikro-orm/migrations";
import { logger } from "./configs/logger";
import path from "path";

dotenv.config();

const rootDir = process.cwd();

const mysqlConfig: Options<MySqlDriver> = {
  entities: [path.join(rootDir, "dist/domain/entities/mysql")],
  entitiesTs: [path.join(rootDir, "src/domain/entities/mysql")],
  dbName: process.env.MYSQL_DB_NAME || "gps_house",
  user: process.env.MYSQL_DB_USER || "root",
  password: process.env.MYSQL_DB_PASSWORD || "",
  host: process.env.MYSQL_DB_HOST || "localhost",
  port: parseInt(process.env.MYSQL_DB_PORT || "3306", 10),
  driver: MySqlDriver,
  debug: process.env.NODE_ENV !== "production",
  logger: (message) => logger.info(message),
  migrations: {
    path: path.join(
      rootDir,
      process.env.NODE_ENV === "production"
        ? "dist/infrastructure/persistence/migrations/mysql"
        : "src/infrastructure/persistence/migrations/mysql",
    ),
    glob: "!(*.d).{js,ts}",
  },
  seeder: {
    path: path.join(
      rootDir,
      process.env.NODE_ENV === "production"
        ? "dist/infrastructure/persistence/seeders"
        : "src/infrastructure/persistence/seeders",
    ),
    glob: "!(*.d).{js,ts}",
  },
  extensions: [Migrator],
  pool: {
    min: parseInt(process.env.MYSQL_DB_POOL_MIN || "2", 10),
    max: parseInt(process.env.MYSQL_DB_POOL_MAX || "10", 10),
  },
  populateWhere: PopulateHint.INFER,
};

export default mysqlConfig;
