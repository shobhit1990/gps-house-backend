import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { ServiceMaintenance } from "../../../../domain/entities/mysql/ServiceMaintenance";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IServiceMaintenanceRepository } from "../../../../domain/repositories/mysql/IServiceMaintenanceRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class ServiceMaintenanceRepository
  implements IServiceMaintenanceRepository
{
  constructor(private readonly em: EntityManager) {}

  async getServiceMaintenances(): Promise<ServiceMaintenance[]> {
    return this.em.fork().find(
      ServiceMaintenance,
      { isDeleted: false },
      {
        populate: ["vehicle"],
      },
    );
  }

  async getServiceMaintenanceById(
    externalId: string,
  ): Promise<ServiceMaintenance | null> {
    return this.em
      .fork()
      .findOne(
        ServiceMaintenance,
        { externalId, isDeleted: false },
        { populate: ["vehicle"] },
      );
  }

  async createServiceMaintenance(
    serviceMaintenance: ServiceMaintenance,
  ): Promise<ServiceMaintenance> {
    const em = this.em.fork();
    serviceMaintenance.vehicle = em.getReference(
      AddVehicle,
      serviceMaintenance.vehicle.id,
    );
    if (serviceMaintenance.createdBy) {
      serviceMaintenance.createdBy = em.getReference(
        Client,
        serviceMaintenance.createdBy.id,
      );
    }
    await em.persistAndFlush(serviceMaintenance);
    await em.populate(serviceMaintenance, ["vehicle"]);
    return serviceMaintenance;
  }

  async updateServiceMaintenance(
    serviceMaintenance: ServiceMaintenance,
  ): Promise<ServiceMaintenance> {
    const em = this.em.fork();
    const existing = await em.findOne(
      ServiceMaintenance,
      { externalId: serviceMaintenance.externalId, isDeleted: false },
      { populate: ["vehicle"] },
    );
    if (!existing) {
      throw new AppError("Service maintenance detail not found", 404);
    }

    em.assign(existing, {
      serviceName: serviceMaintenance.serviceName,
      vehicle: em.getReference(AddVehicle, serviceMaintenance.vehicle.id),
      remark: serviceMaintenance.remark,
      odometerIntervalEnabled: serviceMaintenance.odometerIntervalEnabled,
      odometerInterval: serviceMaintenance.odometerInterval,
      lastServiceOdometer: serviceMaintenance.lastServiceOdometer,
      engineIntervalEnabled: serviceMaintenance.engineIntervalEnabled,
      engineInterval: serviceMaintenance.engineInterval,
      lastServiceEngine: serviceMaintenance.lastServiceEngine,
      daysIntervalEnabled: serviceMaintenance.daysIntervalEnabled,
      daysInterval: serviceMaintenance.daysInterval,
      lastServiceDate: serviceMaintenance.lastServiceDate,
      odometerLeftEnabled: serviceMaintenance.odometerLeftEnabled,
      odometerLeft: serviceMaintenance.odometerLeft,
      engineLeftEnabled: serviceMaintenance.engineLeftEnabled,
      engineLeft: serviceMaintenance.engineLeft,
      daysLeftEnabled: serviceMaintenance.daysLeftEnabled,
      daysLeft: serviceMaintenance.daysLeft,
      updateRecord: serviceMaintenance.updateRecord,
      mobile: serviceMaintenance.mobile,
      serviceDocument: serviceMaintenance.serviceDocument,
      allowVisibilityToDriver: serviceMaintenance.allowVisibilityToDriver,
      status: serviceMaintenance.status,
      reason: serviceMaintenance.reason,
      ...(serviceMaintenance.updatedBy
        ? {
            updatedBy: em.getReference(Client, serviceMaintenance.updatedBy.id),
          }
        : {}),
      updatedAt: new Date(),
    });

    await em.flush();
    await em.populate(existing, ["vehicle"]);
    return existing;
  }

  async deleteServiceMaintenance(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const serviceMaintenance = await em.findOne(ServiceMaintenance, {
      externalId,
      isDeleted: false,
    });
    if (!serviceMaintenance) {
      throw new AppError("Service maintenance detail not found", 404);
    }

    const now = new Date();
    serviceMaintenance.isDeleted = true;
    serviceMaintenance.deletedAt = now;
    serviceMaintenance.updatedAt = now;
    if (deletedBy) {
      serviceMaintenance.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
