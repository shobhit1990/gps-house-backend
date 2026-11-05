import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Geofence } from "../../../../domain/entities/mysql/Geofence";
import { GeofType } from "../../../../domain/entities/mysql/GeofType";
import { IGeofenceRepository } from "../../../../domain/repositories/mysql/IGeofenceRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class GeofenceRepository implements IGeofenceRepository {
  constructor(private readonly em: EntityManager) {}

  async getGeofences(): Promise<Geofence[]> {
    return this.em
      .fork()
      .find(Geofence, { isDeleted: false }, { populate: ["type"] });
  }

  async getGeofenceById(externalId: string): Promise<Geofence | null> {
    return this.em
      .fork()
      .findOne(
        Geofence,
        { externalId, isDeleted: false },
        { populate: ["type"] },
      );
  }

  async createGeofence(geofence: Geofence): Promise<Geofence> {
    const em = this.em.fork();
    geofence.type = em.getReference(GeofType, geofence.type.id);
    if (geofence.createdBy) {
      geofence.createdBy = em.getReference(Client, geofence.createdBy.id);
    }
    await em.persistAndFlush(geofence);
    return geofence;
  }

  async updateGeofence(geofence: Geofence): Promise<Geofence> {
    const em = this.em.fork();
    const existing = await em.findOne(Geofence, {
      externalId: geofence.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Geofence not found", 404);
    }

    em.assign(existing, {
      name: geofence.name,
      type: em.getReference(GeofType, geofence.type.id),
      assignType: geofence.assignType,
      geofenceCode: geofence.geofenceCode,
      transitTime: geofence.transitTime,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      status: geofence.status,
      reason: geofence.reason,
      ...(geofence.updatedBy
        ? { updatedBy: em.getReference(Client, geofence.updatedBy.id) }
        : {}),
    });
    await em.flush();
    return existing;
  }

  async deleteGeofence(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const geofence = await em.findOne(Geofence, {
      externalId,
      isDeleted: false,
    });

    if (!geofence) {
      throw new AppError("Geofence not found", 404);
    }

    geofence.isDeleted = true;
    geofence.deletedAt = new Date();
    if (deletedBy) {
      geofence.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
