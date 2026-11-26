import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreateExpenseDto, UpdateExpenseDto } from "../domain/dto/ExpenseDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import { DriverDetail } from "../domain/entities/mysql/DriverDetail";
import { Expense } from "../domain/entities/mysql/Expense";
import { ExpenseType } from "../domain/entities/mysql/ExpenseType";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { ExpenseFor } from "../domain/enums/ExpenseFor";
import { Status } from "../domain/enums/status";
import { IExpenseRepository } from "../domain/repositories/mysql/IExpenseRepository";
import { AppError } from "../utils/errors";
import { ExpenseResponse, IExpenseService } from "./interfaces/IExpenseService";

@injectable()
export class ExpenseService implements IExpenseService {
  constructor(
    @inject("IExpenseRepository")
    private readonly expenseRepository: IExpenseRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getExpenses(
    limit?: number,
    offset?: number,
  ): Promise<ExpenseResponse[]> {
    const expenses = await this.expenseRepository.getExpenses(limit, offset);
    return expenses.map((expense) => this.toResponse(expense));
  }

  async getExpenseById(externalId: string): Promise<ExpenseResponse> {
    const expense = await this.expenseRepository.getExpenseById(externalId);
    if (!expense) {
      throw new AppError("Expense not found", 404);
    }
    return this.toResponse(expense);
  }

  async createExpense(
    payload: CreateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse> {
    const [client, transporter, expenseType, actor, target] = await Promise.all(
      [
        this.findClient(payload.client),
        this.findTransporter(payload.transporter),
        this.findExpenseType(payload.expenseType),
        this.findActor(actorUserId),
        this.resolveExpenseTarget(payload.expenseFor, payload.vehicle, payload.driver),
      ],
    );

    const expense = new Expense();
    expense.client = client;
    expense.transporter = transporter;
    expense.expenseType = expenseType;
    expense.expenseFor = payload.expenseFor;
    expense.vehicle = target.vehicle;
    expense.driver = target.driver;
    expense.createdBy = actor;
    this.assignFields(expense, payload);
    return this.toResponse(await this.expenseRepository.createExpense(expense));
  }

  async updateExpense(
    externalId: string,
    payload: UpdateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse> {
    const expense = await this.expenseRepository.getExpenseById(externalId);
    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) expense.updatedBy = actor;
    if (payload.client !== undefined) {
      expense.client = await this.findClient(payload.client);
    }
    if (payload.transporter !== undefined) {
      expense.transporter = await this.findTransporter(payload.transporter);
    }
    if (payload.expenseType !== undefined) {
      expense.expenseType = await this.findExpenseType(payload.expenseType);
    }

    const expenseFor = payload.expenseFor ?? expense.expenseFor;
    const vehicleId =
      payload.vehicle !== undefined
        ? payload.vehicle
        : expense.vehicle?.externalId;
    const driverId =
      payload.driver !== undefined
        ? payload.driver
        : expense.driver?.externalId;

    const target = await this.resolveExpenseTarget(
      expenseFor,
      vehicleId,
      driverId,
    );
    expense.expenseFor = expenseFor;
    expense.vehicle = target.vehicle;
    expense.driver = target.driver;

    this.assignFields(expense, payload);
    return this.toResponse(await this.expenseRepository.updateExpense(expense));
  }

  async deleteExpense(externalId: string, actorUserId?: number): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.expenseRepository.deleteExpense(externalId, actor);
  }

  private async resolveExpenseTarget(
    expenseFor: ExpenseFor,
    vehicleId?: string | null,
    driverId?: string | null,
  ): Promise<{ vehicle: AddVehicle | null; driver: DriverDetail | null }> {
    if (expenseFor === ExpenseFor.VEHICLE_WISE) {
      if (!vehicleId) {
        throw new AppError(
          "vehicle is required when expenseFor is VehicleWise",
          400,
        );
      }
      return {
        vehicle: await this.findVehicle(vehicleId),
        driver: null,
      };
    }

    if (!driverId) {
      throw new AppError(
        "driver is required when expenseFor is DriverWise",
        400,
      );
    }
    return {
      vehicle: null,
      driver: await this.findDriver(driverId),
    };
  }

  private async findClient(externalId: string): Promise<Client> {
    const client = await this.em.fork().findOne(Client, {
      externalId,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }
    return client;
  }

  private async findTransporter(externalId: string): Promise<Transporter> {
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
  }

  private async findExpenseType(externalId: string): Promise<ExpenseType> {
    const expenseType = await this.em.fork().findOne(ExpenseType, {
      externalId,
      isDeleted: false,
    });
    if (!expenseType) {
      throw new AppError("Expense type not found", 404);
    }
    return expenseType;
  }

  private async findVehicle(externalId: string): Promise<AddVehicle> {
    const vehicle = await this.em.fork().findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    return vehicle;
  }

  private async findDriver(externalId: string): Promise<DriverDetail> {
    const driver = await this.em.fork().findOne(DriverDetail, {
      externalId,
      isDeleted: false,
    });
    if (!driver) {
      throw new AppError("Driver not found", 404);
    }
    return driver;
  }

  /**
   * Auth gives `users.id`. Audit FKs point at `client`, so resolve via matching
   * externalId. Platform admins have no client row — createdBy/updatedBy stay unset.
   */
  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const authUser = await em.findOne(User, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!authUser) {
      throw new AppError("User not found", 401);
    }

    return (
      (await em.findOne(Client, {
        externalId: authUser.externalId,
        isDeleted: false,
        status: Status.ACTIVE,
      })) ?? undefined
    );
  }

  private assignFields(
    expense: Expense,
    payload: CreateExpenseDto | UpdateExpenseDto,
  ): void {
    if (payload.expenseName !== undefined) {
      expense.expenseName = payload.expenseName ?? undefined;
    }
    if (payload.amount !== undefined) expense.amount = payload.amount;
    if (payload.expenseDate !== undefined) {
      expense.expenseDate = payload.expenseDate;
    }
    if (payload.odometer !== undefined) {
      expense.odometer = payload.odometer ?? undefined;
    }
    if (payload.engineHours !== undefined) {
      expense.engineHours = payload.engineHours ?? undefined;
    }
    if (payload.description !== undefined) {
      expense.description = payload.description ?? undefined;
    }
    if (payload.quantity !== undefined) {
      expense.quantity = payload.quantity ?? undefined;
    }
    if (payload.supplier !== undefined) {
      expense.supplier = payload.supplier ?? undefined;
    }
    if (payload.buyer !== undefined) {
      expense.buyer = payload.buyer ?? undefined;
    }
    if (payload.status !== undefined) expense.status = payload.status;
    if (payload.reason !== undefined) {
      expense.reason = payload.reason ?? undefined;
    }
  }

  private toResponse(expense: Expense): ExpenseResponse {
    const vehicle = expense.vehicle;
    const device =
      vehicle?.device && !vehicle.device.isDeleted ? vehicle.device : null;
    const driver = expense.driver;

    return {
      id: expense.externalId,
      client: this.toClient(expense.client),
      transporter: this.toTransporter(expense.transporter),
      expenseFor: expense.expenseFor,
      vehicle:
        vehicle && !vehicle.isDeleted
          ? {
              id: vehicle.externalId,
              vehicle: vehicle.vehicle,
              mileage: vehicle.mileage,
              vehicleType: vehicle.vehicleType,
              overspeed: vehicle.overspeed,
              hours: vehicle.hours ?? null,
              minutes: vehicle.minutes ?? null,
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
              device: device
                ? {
                    id: device.externalId,
                    imei: device.imei,
                    simNumber: device.simNumber,
                    simOperator: device.simOperator,
                    status: device.status,
                  }
                : null,
            }
          : null,
      driver:
        driver && !driver.isDeleted
          ? {
              id: driver.externalId,
              client: driver.client
                ? {
                    id: driver.client.externalId,
                    name: driver.client.name ?? null,
                    companyName: driver.client.companyName,
                  }
                : null,
              transporter: driver.transporter
                ? {
                    id: driver.transporter.externalId,
                    name: driver.transporter.name ?? null,
                    companyName: driver.transporter.companyName,
                  }
                : null,
              firstName: driver.firstName,
              lastName: driver.lastName,
              deviceId: driver.deviceId ?? null,
              dateOfJoining: driver.dateOfJoining ?? null,
              dateOfLeaving: driver.dateOfLeaving ?? null,
              dateOfBirth: driver.dateOfBirth ?? null,
              experience: driver.experience ?? null,
              salary: driver.salary ?? null,
              phoneNumber: driver.phoneNumber ?? null,
              licenseNumber: driver.licenseNumber ?? null,
              licenseToDrive: driver.licenseToDrive.isInitialized()
                ? driver.licenseToDrive
                    .getItems()
                    .filter((license) => !license.isDeleted)
                    .map((license) => ({
                      id: license.externalId,
                      license: license.license,
                    }))
                : [],
              licenseIssueDate: driver.licenseIssueDate ?? null,
              licenseExpiryDate: driver.licenseExpiryDate ?? null,
              lifeInsuranceNumber: driver.lifeInsuranceNumber ?? null,
              lifeInsuranceExpiryDate: driver.lifeInsuranceExpiryDate ?? null,
              mediclaimNumber: driver.mediclaimNumber ?? null,
              mediclaimExpiryDate: driver.mediclaimExpiryDate ?? null,
              bloodGroup: driver.bloodGroup ?? null,
              supervisorName: driver.supervisorName ?? null,
              supervisorPhoneNumber: driver.supervisorPhoneNumber ?? null,
              address: driver.address ?? null,
              licenseAvailable: driver.licenseAvailable,
              licenseVerified: driver.licenseVerified,
              enableGeoVerifiedAttendance: driver.enableGeoVerifiedAttendance,
              geofences: driver.geofences.isInitialized()
                ? driver.geofences
                    .getItems()
                    .filter((geofence) => !geofence.isDeleted)
                    .map((geofence) => ({
                      id: geofence.externalId,
                      name: geofence.name,
                    }))
                : [],
              status: driver.status ?? null,
              reason: driver.reason ?? null,
              createdAt: driver.createdAt,
              updatedAt: driver.updatedAt,
            }
          : null,
      expenseName: expense.expenseName ?? null,
      expenseType: {
        id: expense.expenseType.externalId,
        expenseName: expense.expenseType.expenseName,
        status: expense.expenseType.status ?? null,
        reason: expense.expenseType.reason ?? null,
        createdAt: expense.expenseType.createdAt,
        updatedAt: expense.expenseType.updatedAt,
        deletedAt: expense.expenseType.deletedAt ?? null,
      },
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate,
      odometer: expense.odometer ?? null,
      engineHours: expense.engineHours ?? null,
      description: expense.description ?? null,
      quantity: expense.quantity ?? null,
      supplier: expense.supplier ?? null,
      buyer: expense.buyer ?? null,
      createdBy: this.toActor(expense.createdBy),
      updatedBy: this.toActor(expense.updatedBy),
      status: expense.status ?? null,
      reason: expense.reason ?? null,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      deletedAt: expense.deletedAt ?? null,
    };
  }

  private toClient(client: Client): Record<string, unknown> {
    return {
      id: client.externalId,
      owner_name: client.owner_name?.ownerName ?? null,
      language: client.language?.languageName ?? null,
      timezone: client.timezone?.timeZone ?? null,
      vehicle_count: client.vehicle_count ?? null,
      userName: client.userName,
      clientImage: client.clientImage ?? null,
      companyName: client.companyName,
      name: client.name ?? null,
      email: client.email ?? null,
      phone: client.phone?.toString() ?? null,
      domain: client.domain ?? null,
      address: client.address ?? null,
      imeiNumber: client.imeiNumber ?? null,
      status: client.status,
      reason: client.reason ?? null,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  private toTransporter(transporter: Transporter): Record<string, unknown> {
    return {
      id: transporter.externalId,
      client: transporter.client
        ? {
            id: transporter.client.externalId,
            name: transporter.client.name ?? null,
            companyName: transporter.client.companyName,
          }
        : null,
      language: transporter.language?.languageName ?? null,
      timezone: transporter.timezone?.timeZone ?? null,
      inactiveTime: transporter.inactiveTime,
      userName: transporter.userName,
      companyName: transporter.companyName,
      name: transporter.name ?? null,
      email: transporter.email ?? null,
      phone: transporter.phone?.toString() ?? null,
      address: transporter.address ?? null,
      subscriptionStartDate: transporter.subscriptionStartDate ?? null,
      subscriptionDueDate: transporter.subscriptionDueDate ?? null,
      subscriptionExtendDate: transporter.subscriptionExtendDate ?? null,
      subscriptionExpiryCount: transporter.subscriptionExpiryCount ?? null,
      maximumRadiusForNearestPOI:
        transporter.maximumRadiusForNearestPOI ?? null,
      minimumDistanceForAddress:
        transporter.minimumDistanceForAddress ?? null,
      dataRestriction: transporter.dataRestriction ?? null,
      status: transporter.status,
      reason: transporter.reason ?? null,
      createdAt: transporter.createdAt,
      updatedAt: transporter.updatedAt,
    };
  }

  private toActor(actor?: Client | null): ExpenseResponse["createdBy"] {
    if (!actor || actor.isDeleted) {
      return null;
    }
    return {
      id: actor.externalId,
      name: actor.name ?? null,
      companyName: actor.companyName,
      userName: actor.userName,
    };
  }
}
