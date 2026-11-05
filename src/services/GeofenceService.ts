import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateGeofenceDto,
  UpdateGeofenceDto,
} from "../domain/dto/GeofenceDto";
import { Client } from "../domain/entities/mysql/Client";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { GeofType } from "../domain/entities/mysql/GeofType";
import { Status } from "../domain/enums/status";
import { IGeofenceRepository } from "../domain/repositories/mysql/IGeofenceRepository";
import { AppError } from "../utils/errors";
import {
  GeofenceResponse,
  IGeofenceService,
} from "./interfaces/IGeofenceService";

@injectable()
export class GeofenceService implements IGeofenceService {
  constructor(
    @inject("IGeofenceRepository")
    private readonly geofenceRepository: IGeofenceRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getGeofences(): Promise<GeofenceResponse[]> {
    const geofences = await this.geofenceRepository.getGeofences();
    return geofences.map((geofence) => this.toResponse(geofence));
  }

  async getGeofenceById(externalId: string): Promise<GeofenceResponse> {
    const geofence = await this.geofenceRepository.getGeofenceById(externalId);
    if (!geofence) {
      throw new AppError("Geofence not found", 404);
    }
    return this.toResponse(geofence);
  }

  async createGeofence(
    payload: CreateGeofenceDto,
    actorUserId?: number,
  ): Promise<GeofenceResponse> {
    this.validateCoordinatePairs(payload.latitude, payload.longitude);
    const [type, actor] = await Promise.all([
      this.findGeofType(payload.type),
      this.findActor(actorUserId),
    ]);

    const geofence = new Geofence();
    geofence.name = payload.name;
    geofence.type = type;
    geofence.assignType = payload.assignType;
    geofence.geofenceCode = payload.geofenceCode;
    geofence.transitTime = payload.transitTime;
    geofence.latitude = [...payload.latitude];
    geofence.longitude = [...payload.longitude];
    geofence.status = payload.status ?? Status.ACTIVE;
    geofence.reason = payload.reason;
    geofence.createdBy = actor;

    const savedGeofence =
      await this.geofenceRepository.createGeofence(geofence);
    return this.getGeofenceById(savedGeofence.externalId);
  }

  async updateGeofence(
    externalId: string,
    payload: UpdateGeofenceDto,
    actorUserId?: number,
  ): Promise<GeofenceResponse> {
    const geofence = await this.geofenceRepository.getGeofenceById(externalId);
    if (!geofence) {
      throw new AppError("Geofence not found", 404);
    }
    this.validateCoordinatePairs(
      payload.latitude ?? geofence.latitude,
      payload.longitude ?? geofence.longitude,
    );

    const [type, actor] = await Promise.all([
      payload.type ? this.findGeofType(payload.type) : geofence.type,
      this.findActor(actorUserId),
    ]);

    if (payload.name !== undefined) geofence.name = payload.name;
    geofence.type = type;
    if (payload.assignType !== undefined) {
      geofence.assignType = payload.assignType;
    }
    if (payload.geofenceCode !== undefined && payload.geofenceCode !== null) {
      geofence.geofenceCode = payload.geofenceCode;
    }
    if (payload.transitTime !== undefined && payload.transitTime !== null) {
      geofence.transitTime = payload.transitTime;
    }
    if (payload.latitude !== undefined) {
      geofence.latitude = [...payload.latitude];
    }
    if (payload.longitude !== undefined) {
      geofence.longitude = [...payload.longitude];
    }
    if (payload.status !== undefined && payload.status !== null) {
      geofence.status = payload.status;
    }
    if (payload.reason !== undefined && payload.reason !== null) {
      geofence.reason = payload.reason;
    }
    geofence.updatedBy = actor;

    const savedGeofence =
      await this.geofenceRepository.updateGeofence(geofence);
    return this.getGeofenceById(savedGeofence.externalId);
  }

  async deleteGeofence(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.geofenceRepository.deleteGeofence(externalId, actor);
  }

  private async findGeofType(externalId: string): Promise<GeofType> {
    const type = await this.em.fork().findOne(GeofType, {
      externalId,
      isDeleted: false,
    });
    if (!type) {
      throw new AppError("Geofence type not found", 404);
    }
    return type;
  }

  private validateCoordinatePairs(
    latitude: number[],
    longitude: number[],
  ): void {
    if (latitude.length !== longitude.length) {
      throw new AppError(
        "Latitude and longitude arrays must contain the same number of coordinates",
        400,
      );
    }

    if (
      latitude.some((value) => value < -90 || value > 90) ||
      longitude.some((value) => value < -180 || value > 180)
    ) {
      throw new AppError("Latitude or longitude is out of range", 400);
    }
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private toResponse(geofence: Geofence): GeofenceResponse {
    return {
      id: geofence.externalId,
      name: geofence.name,
      type: {
        id: geofence.type.externalId,
        geofType: geofence.type.geofType,
      },
      assignType: geofence.assignType,
      geofenceCode: geofence.geofenceCode ?? null,
      transitTime: geofence.transitTime ?? null,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      status: geofence.status ?? null,
      reason: geofence.reason ?? null,
      createdAt: geofence.createdAt,
      updatedAt: geofence.updatedAt,
    };
  }
}
