import { EntityManager, FilterQuery } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Device } from "../../../../domain/entities/mysql/Device";
import { Status } from "../../../../domain/enums/status";
import {
  DeviceLiveStatePatch,
  IVehicleGpsDeviceRepository,
  LiveTrackingVehicleFilter,
} from "../../../../domain/repositories/mysql/IVehicleGpsDeviceRepository";

/** `status` is nullable on add_vehicle; NULL counts as active (SQL `!=` would drop it). */
const NOT_INACTIVE_VEHICLE = {
  $or: [{ status: null }, { status: { $ne: Status.INACTIVE } }],
};

@injectable()
export class VehicleGpsDeviceRepository implements IVehicleGpsDeviceRepository {
  constructor(@inject(EntityManager) private readonly em: EntityManager) {}

  async findDeviceByImei(imei: string): Promise<Device | null> {
    return this.em.fork().findOne(Device, { imei, isDeleted: false });
  }

  async updateDeviceLiveState(deviceId: number, patch: DeviceLiveStatePatch): Promise<void> {
    const data = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as DeviceLiveStatePatch;
    if (Object.keys(data).length === 0) return;
    await this.em.fork().nativeUpdate(Device, { id: deviceId }, { ...data, updatedAt: new Date() });
  }

  async findMappedVehicleByDeviceId(deviceId: number): Promise<AddVehicle | null> {
    return this.em.fork().findOne(
      AddVehicle,
      { device: deviceId, isDeleted: false, ...NOT_INACTIVE_VEHICLE },
      { populate: ["device"], orderBy: { id: "DESC" } },
    );
  }

  async listDevices(): Promise<Device[]> {
    return this.em.fork().find(Device, { isDeleted: false });
  }

  async listVehiclesWithDevice(): Promise<AddVehicle[]> {
    return this.em.fork().find(
      AddVehicle,
      { device: { $ne: null }, isDeleted: false, ...NOT_INACTIVE_VEHICLE },
      { populate: ["device"] },
    );
  }

  async listVehiclesForLiveTracking(filter: LiveTrackingVehicleFilter = {}): Promise<AddVehicle[]> {
    const where: FilterQuery<AddVehicle> = { isDeleted: false, ...NOT_INACTIVE_VEHICLE };
    if (filter.clientId) {
      Object.assign(where, { client: { externalId: filter.clientId } });
    }
    if (filter.transporterId) {
      Object.assign(where, { transporter: { externalId: filter.transporterId } });
    }
    return this.em.fork().find(AddVehicle, where, {
      populate: ["device", "client", "transporter"],
      orderBy: { vehicle: "ASC" },
    });
  }

  async findVehicleByExternalId(externalId: string): Promise<AddVehicle | null> {
    return this.em.fork().findOne(
      AddVehicle,
      { externalId, isDeleted: false },
      { populate: ["device"] },
    );
  }
}
