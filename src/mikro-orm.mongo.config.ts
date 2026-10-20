import { Options } from "@mikro-orm/core";
import dotenv from "dotenv";
import { Migrator } from "@mikro-orm/migrations";
import { logger } from "./configs/logger";
import { MongoDriver } from "@mikro-orm/mongodb";

dotenv.config();

const mongoConfig: Options<MongoDriver> = {
  entities: ["./dist/domain/entities/mongo"],
  entitiesTs: ["./src/domain/entities/mongo"],
  discovery: {
    warnWhenNoEntities: false,
  },
  dbName: process.env.MONGO_DB_NAME || "gps_house",
  clientUrl: process.env.MONGO_CLIENT_URL || "mongodb://localhost:27017",
  driver: MongoDriver,
  debug: process.env.NODE_ENV !== "production",
  logger: (message) => logger.info(message),
  extensions: [Migrator],
};

export default mongoConfig;
