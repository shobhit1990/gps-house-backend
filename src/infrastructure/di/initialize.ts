import "reflect-metadata";
import { createDatabaseIfNotExists } from "./mysql/database";
import { registerMySqlDependencies } from "./mysql/container";
import { registerMongoDependencies } from "./mongo/container";
import { logger } from "../../configs/logger";
import { MikroORM } from "@mikro-orm/core";
import mysqlConfig from "../../mikro-orm.mysql.config";
import mongoConfig from "../../mikro-orm.mongo.config";
import { MySqlDriver } from "@mikro-orm/mysql";
import { MongoDriver } from "@mikro-orm/mongodb";
import { registerOwnerDependencies } from "./mysql/owner-container";
import { registerLanguageDependencies } from "./mysql/language-container";
import { registerTimeZoneDependencies } from "./mysql/timezone-container";
import { registerClientDependencies } from "./mysql/client-container";
import { registerMenuItemDependencies } from "./mysql/menuitem-container";
import { registerTransporterDependencies } from "./mysql/transporter-container";
import { registerAddVehicleDependencies } from "./mysql/addvehicle-container";
import { registerPaymentDetailsDependencies } from "./mysql/paymentDetails-container";
import { registerBillingDetailDependencies } from "./mysql/billingDetail-container";
import { registerTechnicianDependencies } from "./mysql/technician-container";
import { registerJobsheetDependencies } from "./mysql/jobsheet-container";
import { registerAddGroupDependencies } from "./mysql/addGroup-container";
import { registerUserDependencies } from "./mysql/user-container";

export async function initializeApp() {
  try {
    await createDatabaseIfNotExists();

    registerOwnerDependencies();
    registerLanguageDependencies();
    registerTimeZoneDependencies();
    registerClientDependencies();
    registerMenuItemDependencies();
    registerTransporterDependencies();
    registerAddVehicleDependencies();
    registerPaymentDetailsDependencies();
    registerBillingDetailDependencies();
    registerTechnicianDependencies();
    registerJobsheetDependencies();
    registerAddGroupDependencies();
    registerUserDependencies();

    const orm = await initializeORM();

    if (orm.mongoOrm) {
      registerMongoDependencies(orm.mongoOrm);
    } else {
      logger.warn(
        "MongoDB ORM not initialized; skipping Mongo dependency registration",
      );
    }

    registerMySqlDependencies(orm.mySqlOrm);

    logger.info("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    process.exit(1);
  }
}

export async function initializeORM(): Promise<{
  mySqlOrm: MikroORM<MySqlDriver>;
  mongoOrm?: MikroORM<MongoDriver>;
}> {
  try {
    const mySqlOrm = await MikroORM.init<MySqlDriver>(mysqlConfig);
    const schemaGenerator = mySqlOrm.getSchemaGenerator();
    await schemaGenerator.ensureDatabase();
    await mySqlOrm.getMigrator().up();
    await schemaGenerator.updateSchema();

    logger.info("MySQL MikroORM initialized successfully");

    let mongoOrm: MikroORM<MongoDriver> | undefined;
    try {
      mongoOrm = await MikroORM.init<MongoDriver>(mongoConfig);
      await mongoOrm.getSchemaGenerator().ensureIndexes();
      logger.info("MongoDB MikroORM initialized successfully");
    } catch (mongoError) {
      logger.error(
        "Error initializing MongoDB MikroORM. Continuing without MongoDB:",
        mongoError,
      );
    }

    return { mySqlOrm, mongoOrm };
  } catch (error) {
    logger.error("Error initializing MikroORM:", error);
    throw error;
  }
}
