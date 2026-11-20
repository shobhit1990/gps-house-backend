import "reflect-metadata";
import { registerMySqlDependencies } from "./mysql/container";
import { registerMongoDependencies } from "./mongo/container";
import { logger } from "../../configs/logger";
import { MikroORM } from "@mikro-orm/core";
import mysqlConfig from "../../mikro-orm.mysql.config";
import mongoConfig from "../../mikro-orm.mongo.config";
import { MySqlDriver, SqlEntityManager } from "@mikro-orm/mysql";
import { MongoDriver } from "@mikro-orm/mongodb";
import { registerOwnerDependencies } from "./mysql/owner-container";
import { registerLanguageDependencies } from "./mysql/language-container";
import { registerTimeZoneDependencies } from "./mysql/timezone-container";
import { registerClientDependencies } from "./mysql/client-container";
import { registerMenuItemDependencies } from "./mysql/menuitem-container";
import { registerPermissionDependencies } from "./mysql/permission-container";
import { registerTransporterDependencies } from "./mysql/transporter-container";
import { registerAddVehicleDependencies } from "./mysql/addvehicle-container";
import { registerPaymentDetailsDependencies } from "./mysql/paymentDetails-container";
import { registerBillingDetailDependencies } from "./mysql/billingDetail-container";
import { registerTechnicianDependencies } from "./mysql/technician-container";
import { registerJobsheetDependencies } from "./mysql/jobsheet-container";
import { registerAddGroupDependencies } from "./mysql/addGroup-container";
import { registerUserDependencies } from "./mysql/user-container";
import { registerDeviceTypeDependencies } from "./mysql/deviceType-container";
import { registerAddInventoryDependencies } from "./mysql/addInventory-container";
import { registerVehicleDetailDependencies } from "./mysql/vehicleDetail-container";
import { registerExpenseTypeDependencies } from "./mysql/expenseType-container";
import { registerExpenseDependencies } from "./mysql/expense-container";
import { registerDeviceDependencies } from "./mysql/device-container";
import { registerUploadDocumentsDependencies } from "./mysql/uploadDocuments-container";
import { registerRoleDependencies } from "./mysql/role-container";
import { registerAlertDependencies } from "./mysql/alert-container";
import { registerServiceMaintenanceDependencies } from "./mysql/serviceMaintenance-container";
import { registerParkedScheduleDependencies } from "./mysql/parkedSchedule-container";
import { registerAnnouncementDependencies } from "./mysql/announcement-container";
import { registerRaiseTicketDependencies } from "./mysql/raiseTicket-container";
import { registerVehicleConfigDependencies } from "./mysql/vehicleConfig-container";
import { registerMasterLocationDependencies } from "./mysql/masterLocation-container";
import { registerCertificateAddDependencies } from "./mysql/certificateAdd-container";
import { registerTransferCoinDependencies } from "./mysql/transferCoin-container";
import { registerGeofTypeDependencies } from "./mysql/geofType-container";
import { registerGeofenceDependencies } from "./mysql/geofence-container";
import { registerLicenseDependencies } from "./mysql/license-container";
import { registerDriverDetailDependencies } from "./mysql/driverDetail-container";
import { registerPolicyDependencies } from "./mysql/policy-container";
import { DatabaseSeeder } from "../persistence/seeders/DatabaseSeeder";
import { convertUsersUserTypeToRoleFkFromConnection } from "../persistence/mysql/convertUsersUserTypeToRoleFk";
import { registerVehicleGpsDependencies } from "./mysql/vehicleGps-container";
import { container } from "tsyringe";
import { IVehicleGpsDeviceResolver } from "../../services/interfaces/IVehicleGpsDeviceResolver";
import { IVehicleGpsQueue } from "../../services/interfaces/IVehicleGpsQueue";
import { IVehicleGpsListenerManager } from "../../services/interfaces/IVehicleGpsListenerManager";
import { validateClientNamespace } from "../../utils/clientNamespace";
import { getRuntimeRole, shouldRunSeeders, shouldStartGpsWorker } from "../../utils/runtimeRole";
import { isVehicleGpsListenerEnabled, isVehicleGpsRuntimeEnabled } from "../../utils/vehicleGpsRuntime";

export async function initializeApp() {
  try {
    registerOwnerDependencies();
    registerLanguageDependencies();
    registerTimeZoneDependencies();
    registerClientDependencies();
    registerMenuItemDependencies();
    registerPermissionDependencies();
    registerTransporterDependencies();
    registerAddVehicleDependencies();
    registerPaymentDetailsDependencies();
    registerBillingDetailDependencies();
    registerTechnicianDependencies();
    registerJobsheetDependencies();
    registerAddGroupDependencies();
    registerUserDependencies();
    registerDeviceTypeDependencies();
    registerAddInventoryDependencies();
    registerVehicleDetailDependencies();
    registerExpenseTypeDependencies();
    registerExpenseDependencies();
    registerDeviceDependencies();
    registerUploadDocumentsDependencies();
    registerRoleDependencies();
    registerAlertDependencies();
    registerServiceMaintenanceDependencies();
    registerParkedScheduleDependencies();
    registerAnnouncementDependencies();
    registerRaiseTicketDependencies();
    registerVehicleConfigDependencies();
    registerMasterLocationDependencies();
    registerCertificateAddDependencies();
    registerTransferCoinDependencies();
    registerGeofTypeDependencies();
    registerGeofenceDependencies();
    registerLicenseDependencies();
    registerDriverDetailDependencies();
    registerPolicyDependencies();
    registerVehicleGpsDependencies();

    const orm = await initializeORM();

    if (orm.mongoOrm) {
      registerMongoDependencies(orm.mongoOrm);
    } else {
      logger.warn(
        "MongoDB ORM not initialized; skipping Mongo dependency registration",
      );
    }

    registerMySqlDependencies(orm.mySqlOrm);

    const runtimeRole = getRuntimeRole();
    if (orm.mongoOrm && shouldStartGpsWorker()) {
      await startGpsServices();
    } else if (!shouldStartGpsWorker()) {
      logger.info(`GPS services skipped for runtime role: ${runtimeRole}`);
    }

    logger.info(`Application initialized successfully (runtime role: ${runtimeRole})`);
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    process.exit(1);
  }
}

/**
 * Vehicle GPS pipeline (same boot order as dikshank-backend):
 * IMEI cache refresh → queue processors → TCP listeners.
 * Which queue stages run is controlled by GPS_REALTIME_PROCESSOR_ENABLED / GPS_REPORT_PROCESSOR_ENABLED.
 */
async function startGpsServices(): Promise<void> {
  validateClientNamespace();

  if (!isVehicleGpsRuntimeEnabled()) {
    logger.info("Vehicle GPS runtime is disabled; skipping vehicle GPS resolver cache and queue startup");
    return;
  }

  const vehicleGpsDeviceResolver = container.resolve<IVehicleGpsDeviceResolver>("IVehicleGpsDeviceResolver");
  vehicleGpsDeviceResolver.startCacheRefresh();

  const vehicleGpsQueue = container.resolve<IVehicleGpsQueue>("IVehicleGpsQueue");
  await vehicleGpsQueue.startProcessing();

  if (!isVehicleGpsListenerEnabled()) {
    logger.info("Vehicle GPS listener is disabled; queue processor remains active");
    return;
  }

  const vehicleGpsListenerManager = container.resolve<IVehicleGpsListenerManager>("IVehicleGpsListenerManager");
  await vehicleGpsListenerManager.initializeListeners();
  await vehicleGpsListenerManager.startAllListeners();
}

/** Stops TCP listeners and queue timers (graceful shutdown). */
export async function stopGpsServices(): Promise<void> {
  if (!shouldStartGpsWorker() || !isVehicleGpsRuntimeEnabled()) return;
  try {
    if (container.isRegistered("IVehicleGpsListenerManager")) {
      await container.resolve<IVehicleGpsListenerManager>("IVehicleGpsListenerManager").stopAllListeners();
    }
    if (container.isRegistered("IVehicleGpsQueue")) {
      await container.resolve<IVehicleGpsQueue>("IVehicleGpsQueue").stopProcessing();
    }
  } catch (error) {
    logger.error("Error stopping GPS services:", error);
  }
}

export async function initializeORM(): Promise<{
  mySqlOrm: MikroORM<MySqlDriver>;
  mongoOrm?: MikroORM<MongoDriver>;
}> {
  try {
    const mySqlOrm = await MikroORM.init<MySqlDriver>(mysqlConfig);
    const schemaGenerator = mySqlOrm.getSchemaGenerator();
    // Convert enum user_type (+ role_id) to Role FK before updateSchema alters the column.
    await convertUsersUserTypeToRoleFkFromConnection(mySqlOrm.em.getConnection());
    // Create/sync entity tables first. Incremental migrations assume base tables exist
    // (fresh empty DBs previously crashed on ALTER TABLE users before schema sync).
    await schemaGenerator.updateSchema();
    await mySqlOrm.getMigrator().up();
    logger.info("MySQL MikroORM initialized successfully");

    const mongoOrm = await MikroORM.init<MongoDriver>(mongoConfig);
    await mongoOrm.getSchemaGenerator().ensureIndexes();
    logger.info("MongoDB MikroORM initialized successfully");

    // Seeders run in every environment (feature/Report-), but only once per deployment:
    // on the API process, never on the GPS worker processes started alongside it.
    if (shouldRunSeeders()) {
      await runSeeders(mySqlOrm);
      logger.info("Seeders executed successfully");
    } else {
      logger.info(`Seeders skipped for runtime role: ${getRuntimeRole()}`);
    }

    return { mySqlOrm, mongoOrm };
  } catch (error) {
    logger.error("Error initializing MikroORM:", error);
    throw error;
  }

}

export async function runSeeders(
  mySqlOrm: MikroORM<MySqlDriver>,
) {
  const generator = mySqlOrm.em.fork();
  const seeder = new DatabaseSeeder();

  await seeder.run(generator);
}
