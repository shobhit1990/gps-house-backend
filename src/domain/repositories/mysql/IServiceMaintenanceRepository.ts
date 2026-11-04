import { ServiceMaintenance } from "../../entities/mysql/ServiceMaintenance";
import { Client } from "../../entities/mysql/Client";

export interface ServiceMaintenanceBulkCreateResult {
  insertedRecords: number;
  duplicateRecords: number;
}

export interface IServiceMaintenanceRepository {
  getServiceMaintenances(): Promise<ServiceMaintenance[]>;

  getServiceMaintenanceById(
    externalId: string,
  ): Promise<ServiceMaintenance | null>;

  createServiceMaintenance(
    serviceMaintenance: ServiceMaintenance,
  ): Promise<ServiceMaintenance>;

  bulkCreateServiceMaintenances(
    serviceMaintenances: ServiceMaintenance[],
  ): Promise<ServiceMaintenanceBulkCreateResult>;

  updateServiceMaintenance(
    serviceMaintenance: ServiceMaintenance,
  ): Promise<ServiceMaintenance>;

  deleteServiceMaintenance(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void>;
}
