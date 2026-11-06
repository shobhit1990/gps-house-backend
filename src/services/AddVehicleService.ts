import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../domain/dto/AddVehicleDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { Device } from "../domain/entities/mysql/Device";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { IAddVehicleRepository } from "../domain/repositories/mysql/IAddVehicleRepository";
import {
  AddVehicleResponse,
  IAddVehicleService,
} from "./interfaces/IAddVehicleService";
import { AppError } from "../utils/errors";

@injectable()
export class AddVehicleService implements IAddVehicleService {
  constructor(
    @inject("IAddVehicleRepository")
    private readonly vehicleRepository: IAddVehicleRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAddVehicle(): Promise<AddVehicleResponse[]> {
    const vehicles = await this.vehicleRepository.getAddVehicle();
    return vehicles.map((vehicle) => this.toResponse(vehicle, true));
  }

  async getAddVehicleById(externalId: string): Promise<AddVehicleResponse> {
    const vehicle = await this.vehicleRepository.getAddVehicleById(externalId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    return this.toResponse(vehicle, true);
  }

  async createAddVehicle(
    payload: CreateAddVehicleDto,
  ): Promise<AddVehicleResponse> {
    const em = this.em.fork();
    const client = await em.findOne(Client, {
      externalId: payload.client,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const device = await em.findOne(Device, {
      externalId: payload.device,
      isDeleted: false,
    });
    if (!device) {
      throw new AppError("Device not found", 404);
    }

    const transporter = await em.findOne(
      Transporter,
      { externalId: payload.transporter, isDeleted: false },
      { populate: ["client"] },
    );
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }

    this.validateSubscriptionDates(
      payload.subscriptionStartDate,
      payload.subscriptionDueDate,
    );

    const vehicle = new AddVehicle();
    this.assignFields(vehicle, payload);
    vehicle.client = client;
    vehicle.device = device;
    vehicle.transporter = transporter;
    return this.toResponse(
      await this.vehicleRepository.createAddVehicle(vehicle),
    );
  }

  async updateAddVehicle(
    externalId: string,
    payload: UpdateAddVehicleDto,
  ): Promise<AddVehicleResponse> {
    const existing = await this.vehicleRepository.getAddVehicleById(externalId);
    if (!existing) {
      throw new AppError("Vehicle not found", 404);
    }
    const em = this.em.fork();
    const client = payload.client
      ? await em.findOne(Client, {
          externalId: payload.client,
          isDeleted: false,
        })
      : existing.client;
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const device =
      payload.device === undefined
        ? existing.device
        : payload.device === null
          ? null
          : await em.findOne(Device, {
              externalId: payload.device,
              isDeleted: false,
            });
    if (typeof payload.device === "string" && !device) {
      throw new AppError("Device not found", 404);
    }

    const transporter = payload.transporter
      ? await em.findOne(
          Transporter,
          { externalId: payload.transporter, isDeleted: false },
          { populate: ["client"] },
        )
      : existing.transporter;
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }

    const startDate =
      payload.subscriptionStartDate ??
      existing.subscriptionStartDate.toISOString().slice(0, 10);
    const dueDate =
      payload.subscriptionDueDate ??
      existing.subscriptionDueDate.toISOString().slice(0, 10);
    this.validateSubscriptionDates(startDate, dueDate);

    this.assignFields(existing, payload);
    existing.client = client;
    existing.device = device ?? null;
    existing.transporter = transporter;
    return this.toResponse(
      await this.vehicleRepository.updateAddVehicle(existing),
    );
  }

  async deleteAddVehicle(externalId: string): Promise<void> {
    await this.vehicleRepository.deleteAddVehicle(externalId);
  }

  private validateSubscriptionDates(startDate: string, dueDate: string): void {
    if (new Date(dueDate).getTime() <= new Date(startDate).getTime()) {
      throw new AppError(
        "Subscription due date must be after the start date",
        400,
      );
    }
  }

  private assignFields(
    vehicle: AddVehicle,
    payload: CreateAddVehicleDto | UpdateAddVehicleDto,
  ): void {
    if (payload.vehicle !== undefined) vehicle.vehicle = payload.vehicle;
    if (payload.mileage !== undefined) vehicle.mileage = payload.mileage;
    if (payload.vehicleType !== undefined)
      vehicle.vehicleType = payload.vehicleType;
    if (payload.overspeed !== undefined) vehicle.overspeed = payload.overspeed;
    if (payload.hours !== undefined) vehicle.hours = payload.hours;
    if (payload.minutes !== undefined) vehicle.minutes = payload.minutes;
    if (payload.subscriptionStartDate !== undefined) {
      vehicle.subscriptionStartDate = new Date(payload.subscriptionStartDate);
    }
    if (payload.subscriptionDueDate !== undefined) {
      vehicle.subscriptionDueDate = new Date(payload.subscriptionDueDate);
    }
    if (payload.fuelType !== undefined) vehicle.fuelType = payload.fuelType;
    if (payload.currentOdometerReading !== undefined) {
      vehicle.currentOdometerReading = payload.currentOdometerReading;
    }
    if (payload.vehicleNickname !== undefined)
      vehicle.vehicleNickname = payload.vehicleNickname;
    if (payload.remark !== undefined) vehicle.remark = payload.remark;
    if (payload.durationOdometer !== undefined)
      vehicle.durationOdometer = payload.durationOdometer;
    if (payload.remark2 !== undefined) vehicle.remark2 = payload.remark2;
    if (payload.parkingViolationAlarmOnIgnitionOn !== undefined) {
      vehicle.parkingViolationAlarmOnIgnitionOn =
        payload.parkingViolationAlarmOnIgnitionOn;
    }
    if (payload.ownerName !== undefined) vehicle.ownerName = payload.ownerName;
    if (payload.ownedBy !== undefined) vehicle.ownedBy = payload.ownedBy;
    if (payload.vehicleBrand !== undefined)
      vehicle.vehicleBrand = payload.vehicleBrand;
    if (payload.vehicleModel !== undefined)
      vehicle.vehicleModel = payload.vehicleModel;
    if (payload.vehicleBody !== undefined)
      vehicle.vehicleBody = payload.vehicleBody;
    if (payload.capacity !== undefined) vehicle.capacity = payload.capacity;
    if (payload.manufactureDate !== undefined) {
      vehicle.manufactureDate = new Date(payload.manufactureDate);
    }
    if (payload.purchaseDate !== undefined) {
      vehicle.purchaseDate = new Date(payload.purchaseDate);
    }
    if (payload.status !== undefined) vehicle.status = payload.status;
    if (payload.reason !== undefined) vehicle.reason = payload.reason;
  }

  private toResponse(
    vehicle: AddVehicle,
    includeRelationshipDetails = false,
  ): AddVehicleResponse {
    return {
      id: vehicle.externalId,
      vehicle: vehicle.vehicle,
      mileage: vehicle.mileage,
      vehicleType: vehicle.vehicleType,
      overspeed: vehicle.overspeed,
      hours: vehicle.hours ?? null,
      minutes: vehicle.minutes ?? null,
      client: includeRelationshipDetails
        ? {
            id: vehicle.client.externalId,
            userName: vehicle.client.userName,
            name: vehicle.client.name ?? null,
            companyName: vehicle.client.companyName,
            email: vehicle.client.email ?? null,
            phone: vehicle.client.phone?.toString() ?? null,
            address: vehicle.client.address ?? null,
            owner: vehicle.client.owner_name
              ? {
                  id: vehicle.client.owner_name.externalId,
                  ownerName: vehicle.client.owner_name.ownerName,
                }
              : null,
            language: {
              id: vehicle.client.language.externalId,
              languageName: vehicle.client.language.languageName,
            },
            timezone: {
              id: vehicle.client.timezone.externalId,
              timeZone: vehicle.client.timezone.timeZone,
            },
            clientImage: vehicle.client.clientImage ?? null,
            imeiNumber: vehicle.client.imeiNumber ?? null,
            status: vehicle.client.status,
            reason: vehicle.client.reason ?? null,
          }
        : {
            id: vehicle.client.externalId,
            name: vehicle.client.name,
            companyName: vehicle.client.companyName,
          },
      device:
        vehicle.device && !vehicle.device.isDeleted
          ? includeRelationshipDetails
            ? {
                id: vehicle.device.externalId,
                imei: vehicle.device.imei,
                simNumber: vehicle.device.simNumber,
                simOperator: vehicle.device.simOperator,
                secondarySimNumber: vehicle.device.secondarySimNumber ?? null,
                secondarySimOperator:
                  vehicle.device.secondarySimOperator ?? null,
                deviceType: {
                  id: vehicle.device.deviceType.externalId,
                  deviceName: vehicle.device.deviceType.deviceName,
                },
                client: {
                  id: vehicle.device.client.externalId,
                  name: vehicle.device.client.name ?? null,
                  companyName: vehicle.device.client.companyName,
                },
                status: vehicle.device.status,
                reason: vehicle.device.reason ?? null,
                ignitionWireConnected: vehicle.device.ignitionWireConnected,
                ignitionWireNotConnected:
                  vehicle.device.ignitionWireNotConnected,
                airConditionWireConnected:
                  vehicle.device.airConditionWireConnected,
                attendance: vehicle.device.attendance,
                timezoneSetting: vehicle.device.timezoneSetting,
                createdAt: vehicle.device.createdAt,
                updatedAt: vehicle.device.updatedAt,
              }
            : {
                id: vehicle.device.externalId,
                imei: vehicle.device.imei,
              }
          : null,
      transporter: includeRelationshipDetails
        ? {
            id: vehicle.transporter.externalId,
            userName: vehicle.transporter.userName,
            name: vehicle.transporter.name ?? null,
            companyName: vehicle.transporter.companyName,
            client: {
              id: vehicle.transporter.client.externalId,
              name: vehicle.transporter.client.name ?? null,
              companyName: vehicle.transporter.client.companyName,
            },
            language: {
              id: vehicle.transporter.language.externalId,
              languageName: vehicle.transporter.language.languageName,
            },
            timezone: {
              id: vehicle.transporter.timezone.externalId,
              timeZone: vehicle.transporter.timezone.timeZone,
            },
            inactiveTime: vehicle.transporter.inactiveTime,
            email: vehicle.transporter.email ?? null,
            phone: vehicle.transporter.phone?.toString() ?? null,
            address: vehicle.transporter.address ?? null,
            subscriptionStartDate:
              vehicle.transporter.subscriptionStartDate ?? null,
            subscriptionDueDate:
              vehicle.transporter.subscriptionDueDate ?? null,
            subscriptionExtendDate: vehicle.transporter.subscriptionExtendDate,
            subscriptionExpiryCount:
              vehicle.transporter.subscriptionExpiryCount ?? null,
            maximumRadiusForNearestPOI:
              vehicle.transporter.maximumRadiusForNearestPOI ?? null,
            minimumDistanceForAddress:
              vehicle.transporter.minimumDistanceForAddress ?? null,
            dataRestriction: vehicle.transporter.dataRestriction ?? null,
            status: vehicle.transporter.status,
            reason: vehicle.transporter.reason ?? null,
          }
        : {
            id: vehicle.transporter.externalId,
            userName: vehicle.transporter.userName,
            name: vehicle.transporter.name,
            companyName: vehicle.transporter.companyName,
          },
      subscriptionStartDate: vehicle.subscriptionStartDate,
      subscriptionDueDate: vehicle.subscriptionDueDate,
      fuelType: vehicle.fuelType ?? null,
      currentOdometerReading: vehicle.currentOdometerReading ?? null,
      vehicleNickname: vehicle.vehicleNickname ?? null,
      remark: vehicle.remark ?? null,
      durationOdometer: vehicle.durationOdometer ?? null,
      remark2: vehicle.remark2 ?? null,
      parkingViolationAlarmOnIgnitionOn:
        vehicle.parkingViolationAlarmOnIgnitionOn,
      ownerName: vehicle.ownerName ?? null,
      ownedBy: vehicle.ownedBy ?? null,
      vehicleBrand: vehicle.vehicleBrand ?? null,
      vehicleModel: vehicle.vehicleModel ?? null,
      vehicleBody: vehicle.vehicleBody ?? null,
      capacity: vehicle.capacity ?? null,
      manufactureDate: vehicle.manufactureDate ?? null,
      purchaseDate: vehicle.purchaseDate ?? null,
      status: vehicle.status ?? null,
      reason: vehicle.reason ?? null,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
