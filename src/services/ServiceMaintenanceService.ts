import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import path from "path";
import * as XLSX from "xlsx";
import { logger } from "../configs/logger";
import {
  CreateServiceMaintenanceDto,
  UpdateServiceMaintenanceDto,
} from "../domain/dto/ServiceMaintenanceDto";
import { ServiceMaintenance } from "../domain/entities/mysql/ServiceMaintenance";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { Status } from "../domain/enums/status";
import { IServiceMaintenanceRepository } from "../domain/repositories/mysql/IServiceMaintenanceRepository";
import { AppError } from "../utils/errors";
import { getServiceMaintenanceDuplicateKey } from "../utils/serviceMaintenanceDuplicate";
import {
  IServiceMaintenanceService,
  ServiceMaintenanceBulkUploadError,
  ServiceMaintenanceBulkUploadResult,
  ServiceMaintenanceResponse,
} from "./interfaces/IServiceMaintenanceService";

const SERVICE_MAINTENANCE_EXCEL_COLUMNS = [
  "serviceName",
  "vehicle",
  "remark",
  "odometerIntervalEnabled",
  "odometerInterval",
  "lastServiceOdometer",
  "engineIntervalEnabled",
  "engineInterval",
  "lastServiceEngine",
  "daysIntervalEnabled",
  "daysInterval",
  "lastServiceDate",
  "odometerLeftEnabled",
  "odometerLeft",
  "engineLeftEnabled",
  "engineLeft",
  "daysLeftEnabled",
  "daysLeft",
  "updateRecord",
  "mobile",
  "serviceDocument",
  "allowVisibilityToDriver",
  "status",
  "reason",
] as const;

type ServiceMaintenanceExcelColumn =
  (typeof SERVICE_MAINTENANCE_EXCEL_COLUMNS)[number];

const booleanExcelColumns = new Set<string>([
  "odometerIntervalEnabled",
  "engineIntervalEnabled",
  "daysIntervalEnabled",
  "odometerLeftEnabled",
  "engineLeftEnabled",
  "daysLeftEnabled",
  "updateRecord",
  "mobile",
  "allowVisibilityToDriver",
]);
const numericExcelColumns = new Set<string>([
  "odometerInterval",
  "lastServiceOdometer",
  "engineInterval",
  "lastServiceEngine",
  "daysInterval",
  "odometerLeft",
  "engineLeft",
  "daysLeft",
]);
const integerExcelColumns = new Set(["daysInterval", "daysLeft"]);
const stringExcelColumns = new Set([
  "serviceName",
  "vehicle",
  "remark",
  "serviceDocument",
  "reason",
  "status",
]);

interface ParsedBulkRow {
  row: number;
  dto: UpdateServiceMaintenanceDto;
  serviceName: string;
  vehicleNumber: string;
  serviceDocument?: string;
}

@injectable()
export class ServiceMaintenanceService implements IServiceMaintenanceService {
  constructor(
    @inject("IServiceMaintenanceRepository")
    private readonly serviceMaintenanceRepository: IServiceMaintenanceRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getServiceMaintenances(): Promise<ServiceMaintenanceResponse[]> {
    const details =
      await this.serviceMaintenanceRepository.getServiceMaintenances();
    return details.map((detail) => this.toResponse(detail));
  }

  async getServiceMaintenanceExport(): Promise<Buffer> {
    const records = await this.getServiceMaintenances();
    const columns = [
      "serviceName",
      "vehicle",
      "remark",
      "odometerIntervalEnabled",
      "odometerInterval",
      "lastServiceOdometer",
      "engineIntervalEnabled",
      "engineInterval",
      "lastServiceEngine",
      "daysIntervalEnabled",
      "daysInterval",
      "lastServiceDate",
      "odometerLeftEnabled",
      "odometerLeft",
      "engineLeftEnabled",
      "engineLeft",
      "daysLeftEnabled",
      "daysLeft",
      "updateRecord",
      "mobile",
      "serviceDocument",
      "allowVisibilityToDriver",
      "status",
      "reason",
    ] as const;
    const rows: unknown[][] = [
      [...columns],
      ...records.map((record) => [
        record.serviceName,
        record.vehicle.vehicle,
        record.remark ?? "",
        record.odometerIntervalEnabled,
        record.odometerInterval ?? "",
        record.lastServiceOdometer ?? "",
        record.engineIntervalEnabled,
        record.engineInterval ?? "",
        record.lastServiceEngine ?? "",
        record.daysIntervalEnabled,
        record.daysInterval ?? "",
        record.lastServiceDate ?? "",
        record.odometerLeftEnabled,
        record.odometerLeft ?? "",
        record.engineLeftEnabled,
        record.engineLeft ?? "",
        record.daysLeftEnabled,
        record.daysLeft ?? "",
        record.updateRecord,
        record.mobile,
        record.serviceDocument ?? "",
        record.allowVisibilityToDriver,
        record.status,
        record.reason ?? "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = columns.map((column) => ({
      wch: Math.max(column.length + 2, 20),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service Maintenance");

    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }

  async bulkUploadServiceMaintenances(
    fileName: string,
    fileBuffer: Buffer,
    actorUserId?: number,
  ): Promise<ServiceMaintenanceBulkUploadResult> {
    const extension = path.extname(fileName).toLowerCase();
    if (extension !== ".xlsx" && extension !== ".xls") {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message: "Only .xlsx and .xls files are supported",
        },
      ]);
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
    } catch (error) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message:
            error instanceof Error
              ? `Unable to read Excel file: ${error.message}`
              : "Unable to read Excel file",
        },
      ]);
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    const sheetRef = sheet?.["!ref"];
    if (!sheet || !sheetRef) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message: "The workbook's first worksheet is missing or empty",
        },
      ]);
    }

    const range = XLSX.utils.decode_range(sheetRef);
    const headerRowNumber = range.s.r + 1;
    const headerIndexes = new Map<string, number>();
    const canonicalColumns = new Map<string, ServiceMaintenanceExcelColumn>(
      SERVICE_MAINTENANCE_EXCEL_COLUMNS.map((column) => [
        column.toLowerCase(),
        column,
      ]),
    );
    canonicalColumns.set("vehicleexternalid", "vehicle");
    const errors: ServiceMaintenanceBulkUploadError[] = [];

    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex++) {
      const cell = sheet[
        XLSX.utils.encode_cell({ r: range.s.r, c: columnIndex })
      ] as XLSX.CellObject | undefined;
      const header = String(cell?.v ?? "").trim();
      if (!header) continue;

      const column = canonicalColumns.get(header.toLowerCase());
      if (!column) {
        errors.push({
          row: headerRowNumber,
          column: header,
          message: "Unknown column header",
        });
        continue;
      }
      if (headerIndexes.has(column)) {
        errors.push({
          row: headerRowNumber,
          column,
          message: "Duplicate column header",
        });
        continue;
      }
      headerIndexes.set(column, columnIndex);
    }

    for (const column of ["serviceName", "vehicle"] as const) {
      if (!headerIndexes.has(column)) {
        errors.push({
          row: headerRowNumber,
          column,
          message: "Required column header is missing",
        });
      }
    }

    const sourceRows: Array<{ row: number; values: unknown[] }> = [];
    for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex++) {
      const values: unknown[] = [];
      let hasValues = false;
      for (
        let columnIndex = range.s.c;
        columnIndex <= range.e.c;
        columnIndex++
      ) {
        const cell = sheet[
          XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
        ] as XLSX.CellObject | undefined;
        const value = cell?.v ?? "";
        values[columnIndex] = value;
        if (String(value).trim() !== "") hasValues = true;
      }
      if (hasValues) sourceRows.push({ row: rowIndex + 1, values });
    }

    const totalRecords = sourceRows.length;
    if (totalRecords === 0) {
      errors.push({
        row: headerRowNumber + 1,
        column: "file",
        message: "The first worksheet contains no records",
      });
    }

    const parsedRows: ParsedBulkRow[] = [];
    for (const sourceRow of sourceRows) {
      const errorsBeforeRow = errors.length;
      const record: Record<string, unknown> = {};
      let vehicleNumber: string | undefined;

      for (const column of SERVICE_MAINTENANCE_EXCEL_COLUMNS) {
        const index = headerIndexes.get(column);
        if (index === undefined) continue;
        const value = sourceRow.values[index];
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          continue;
        }

        if (column === "vehicle") {
          if (
            (typeof value !== "string" && typeof value !== "number") ||
            String(value).trim() === ""
          ) {
            errors.push({
              row: sourceRow.row,
              column,
              message: "Vehicle number must be text or a number",
            });
          } else {
            vehicleNumber = String(value).trim();
          }
          continue;
        }

        const normalized = this.normalizeBulkExcelCell(column, value);
        if (normalized.error) {
          errors.push({
            row: sourceRow.row,
            column,
            message: normalized.error,
          });
        } else {
          record[column] = normalized.value;
        }
      }

      const dtoRecord = { ...record };
      delete dtoRecord.serviceDocument;
      delete dtoRecord.vehicle;
      const dto = plainToInstance(UpdateServiceMaintenanceDto, dtoRecord);
      const dtoErrors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      for (const validationError of dtoErrors) {
        errors.push({
          row: sourceRow.row,
          column: validationError.property,
          message:
            Object.values(validationError.constraints ?? {}).join("; ") ||
            "Invalid value",
        });
      }
      const serviceName =
        typeof record.serviceName === "string" ? record.serviceName.trim() : "";
      if (!serviceName) {
        errors.push({
          row: sourceRow.row,
          column: "serviceName",
          message: "serviceName is required",
        });
      } else if (serviceName.length > 255) {
        errors.push({
          row: sourceRow.row,
          column: "serviceName",
          message: "serviceName must be 255 characters or fewer",
        });
      }
      if (!vehicleNumber) {
        errors.push({
          row: sourceRow.row,
          column: "vehicle",
          message: "Vehicle number is required",
        });
      }

      if (
        typeof record.serviceDocument === "string" &&
        record.serviceDocument.length > 1000
      ) {
        errors.push({
          row: sourceRow.row,
          column: "serviceDocument",
          message: "serviceDocument must be 1000 characters or fewer",
        });
      }

      if (
        errors.length === errorsBeforeRow &&
        dtoErrors.length === 0 &&
        vehicleNumber &&
        serviceName
      ) {
        parsedRows.push({
          row: sourceRow.row,
          dto,
          serviceName,
          vehicleNumber,
          serviceDocument:
            typeof record.serviceDocument === "string"
              ? record.serviceDocument
              : undefined,
        });
      }
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    const em = this.em.fork();
    const vehicleNumbers = [
      ...new Set(parsedRows.map(({ vehicleNumber }) => vehicleNumber)),
    ];
    const vehicles = await em.find(
      AddVehicle,
      {
        vehicle: { $in: vehicleNumbers },
        isDeleted: false,
      },
      { populate: ["client"] },
    );
    const vehiclesByNumber = new Map<string, AddVehicle[]>();
    for (const vehicle of vehicles) {
      const key = this.normalizeVehicleNumber(vehicle.vehicle);
      const matches = vehiclesByNumber.get(key) ?? [];
      matches.push(vehicle);
      vehiclesByNumber.set(key, matches);
    }
    const actor = await this.findActor(em, actorUserId);
    const details: ServiceMaintenance[] = [];
    const rowsForDetails: number[] = [];
    const fileKeys = new Set<string>();
    let duplicateRecords = 0;

    for (const parsedRow of parsedRows) {
      const vehicleMatches =
        vehiclesByNumber.get(
          this.normalizeVehicleNumber(parsedRow.vehicleNumber),
        ) ?? [];
      let vehicle: AddVehicle | undefined;
      if (vehicleMatches.length === 1) {
        vehicle = vehicleMatches[0];
      } else if (vehicleMatches.length > 1 && actor) {
        const clientMatches = vehicleMatches.filter(
          (match) => match.client.id === actor.id,
        );
        if (clientMatches.length === 1) {
          vehicle = clientMatches[0];
        }
      }

      if (!vehicle && vehicleMatches.length === 0) {
        errors.push({
          row: parsedRow.row,
          column: "vehicle",
          message: `Vehicle number "${parsedRow.vehicleNumber}" was not found or has been deleted`,
        });
        continue;
      }
      if (!vehicle) {
        errors.push({
          row: parsedRow.row,
          column: "vehicle",
          message: `Vehicle number "${parsedRow.vehicleNumber}" is ambiguous; use a vehicle assigned to the authenticated client`,
        });
        continue;
      }
      if (vehicle.status !== undefined && vehicle.status !== Status.ACTIVE) {
        errors.push({
          row: parsedRow.row,
          column: "vehicle",
          message: "Vehicle is inactive",
        });
        continue;
      }

      const key = getServiceMaintenanceDuplicateKey(
        vehicle.externalId,
        parsedRow.serviceName,
      );
      if (fileKeys.has(key)) {
        duplicateRecords += 1;
        continue;
      }
      fileKeys.add(key);

      const detail = new ServiceMaintenance();
      detail.serviceName = parsedRow.serviceName;
      detail.vehicle = vehicle;
      detail.remark = parsedRow.dto.remark ?? null;
      detail.odometerIntervalEnabled =
        parsedRow.dto.odometerIntervalEnabled ?? false;
      detail.odometerInterval = parsedRow.dto.odometerInterval ?? null;
      detail.lastServiceOdometer = parsedRow.dto.lastServiceOdometer ?? null;
      detail.engineIntervalEnabled =
        parsedRow.dto.engineIntervalEnabled ?? false;
      detail.engineInterval = parsedRow.dto.engineInterval ?? null;
      detail.lastServiceEngine = parsedRow.dto.lastServiceEngine ?? null;
      detail.daysIntervalEnabled = parsedRow.dto.daysIntervalEnabled ?? false;
      detail.daysInterval = parsedRow.dto.daysInterval ?? null;
      detail.lastServiceDate = parsedRow.dto.lastServiceDate
        ? new Date(`${parsedRow.dto.lastServiceDate}T00:00:00.000Z`)
        : null;
      detail.odometerLeftEnabled = parsedRow.dto.odometerLeftEnabled ?? false;
      detail.odometerLeft = parsedRow.dto.odometerLeft ?? null;
      detail.engineLeftEnabled = parsedRow.dto.engineLeftEnabled ?? false;
      detail.engineLeft = parsedRow.dto.engineLeft ?? null;
      detail.daysLeftEnabled = parsedRow.dto.daysLeftEnabled ?? false;
      detail.daysLeft = parsedRow.dto.daysLeft ?? null;
      detail.updateRecord = parsedRow.dto.updateRecord ?? false;
      detail.mobile = parsedRow.dto.mobile ?? false;
      detail.serviceDocument = parsedRow.serviceDocument ?? null;
      detail.allowVisibilityToDriver =
        parsedRow.dto.allowVisibilityToDriver ?? false;
      detail.status = parsedRow.dto.status ?? Status.ACTIVE;
      detail.reason = parsedRow.dto.reason ?? null;
      detail.createdBy = actor;
      details.push(detail);
      rowsForDetails.push(parsedRow.row);
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    try {
      const result =
        await this.serviceMaintenanceRepository.bulkCreateServiceMaintenances(
          details,
        );
      return {
        httpStatus: 200,
        success: true,
        message: "Service maintenance records uploaded successfully",
        totalRecords,
        insertedRecords: result.insertedRecords,
        duplicateRecords: duplicateRecords + result.duplicateRecords,
        failedRecords: 0,
        errors: [],
      };
    } catch (error) {
      logger.error({
        message: "Service maintenance bulk upload transaction failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalRecords,
      });
      return {
        httpStatus: 500,
        success: false,
        message:
          "Service maintenance records could not be uploaded; the transaction was rolled back",
        totalRecords,
        insertedRecords: 0,
        duplicateRecords,
        failedRecords: details.length,
        errors: rowsForDetails.map((row) => ({
          row,
          column: "record",
          message: "Database transaction failed; no records were inserted",
        })),
      };
    }
  }

  async getServiceMaintenanceById(
    externalId: string,
  ): Promise<ServiceMaintenanceResponse> {
    const detail =
      await this.serviceMaintenanceRepository.getServiceMaintenanceById(
        externalId,
      );
    if (!detail) {
      throw new AppError("Service maintenance detail not found", 404);
    }
    return this.toResponse(detail);
  }

  async createServiceMaintenance(
    payload: CreateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse> {
    const em = this.em.fork();
    const vehicle = await this.findVehicle(em, payload.vehicle);
    const actor = await this.findActor(em, actorUserId);

    const detail = new ServiceMaintenance();
    detail.serviceName = payload.serviceName;
    detail.vehicle = vehicle;
    detail.remark = payload.remark ?? null;
    this.assignFields(detail, payload);
    detail.serviceDocument = serviceDocument ?? null;
    detail.status = payload.status ?? Status.ACTIVE;
    detail.reason = payload.reason ?? null;
    detail.createdBy = actor;

    const created =
      await this.serviceMaintenanceRepository.createServiceMaintenance(detail);
    return this.toResponse(created);
  }

  async updateServiceMaintenance(
    externalId: string,
    payload: UpdateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse> {
    if (Object.keys(payload).length === 0 && serviceDocument === undefined) {
      throw new AppError(
        "At least one field is required to update service maintenance",
        400,
      );
    }

    const existing =
      await this.serviceMaintenanceRepository.getServiceMaintenanceById(
        externalId,
      );
    if (!existing) {
      throw new AppError("Service maintenance detail not found", 404);
    }

    const em = this.em.fork();
    const vehicle =
      payload.vehicle !== undefined
        ? await this.findVehicle(em, payload.vehicle)
        : existing.vehicle;
    existing.serviceName = payload.serviceName ?? existing.serviceName;
    existing.vehicle = vehicle;
    if (payload.remark !== undefined) existing.remark = payload.remark;
    this.assignFields(existing, payload);
    if (serviceDocument !== undefined) {
      existing.serviceDocument = serviceDocument;
    } else if (payload.removeServiceDocument) {
      existing.serviceDocument = null;
    }
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;

    const actor = await this.findActor(em, actorUserId);
    if (actor) existing.updatedBy = actor;

    const updated =
      await this.serviceMaintenanceRepository.updateServiceMaintenance(
        existing,
      );
    return this.toResponse(updated);
  }

  async deleteServiceMaintenance(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const em = this.em.fork();
    const actor = await this.findActor(em, actorUserId);
    await this.serviceMaintenanceRepository.deleteServiceMaintenance(
      externalId,
      actor,
    );
  }

  private normalizeBulkExcelCell(
    column: ServiceMaintenanceExcelColumn,
    value: unknown,
  ): { value?: unknown; error?: string } {
    if (stringExcelColumns.has(column)) {
      if (typeof value !== "string") return { error: "Value must be text" };
      const normalized = value.trim();
      return {
        value: column === "status" ? normalized.toLowerCase() : normalized,
      };
    }

    if (booleanExcelColumns.has(column)) {
      if (typeof value === "boolean") return { value };
      if (value === 1 || value === "1") return { value: true };
      if (value === 0 || value === "0") return { value: false };
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return { value: true };
        if (normalized === "false") return { value: false };
      }
      return { error: "Value must be true or false" };
    }

    if (numericExcelColumns.has(column)) {
      const normalized =
        typeof value === "number"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : Number.NaN;
      if (!Number.isFinite(normalized)) {
        return { error: "Value must be a finite number" };
      }
      if (integerExcelColumns.has(column) && !Number.isInteger(normalized)) {
        return { error: "Value must be an integer" };
      }
      return { value: normalized };
    }

    if (column === "lastServiceDate") {
      const date = this.normalizeBulkExcelDate(value);
      return date ? { value: date } : { error: "Value must be a valid date" };
    }

    return { error: "Unsupported Excel column" };
  }

  private normalizeVehicleNumber(vehicleNumber: string): string {
    return vehicleNumber.trim().toLocaleUpperCase("en-US");
  }

  private normalizeBulkExcelDate(value: unknown): string | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      const parts = XLSX.SSF.parse_date_code(value);
      if (parts && parts.y >= 1 && parts.y <= 9999) {
        return this.toBulkDateString(parts.y, parts.m, parts.d);
      }
      return undefined;
    }
    if (typeof value !== "string") return undefined;

    const text = value.trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
    const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (isoDate) {
      if (text.length > 10 && Number.isNaN(Date.parse(text))) return undefined;
      return this.toBulkDateString(
        Number(isoDate[1]),
        Number(isoDate[2]),
        Number(isoDate[3]),
      );
    }
    if (usDate) {
      return this.toBulkDateString(
        Number(usDate[3]),
        Number(usDate[1]),
        Number(usDate[2]),
      );
    }
    return undefined;
  }

  private toBulkDateString(
    year: number,
    month: number,
    day: number,
  ): string | undefined {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      year < 1 ||
      year > 9999 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return undefined;
    }
    return date.toISOString().slice(0, 10);
  }

  private bulkUploadFailure(
    totalRecords: number,
    errors: ServiceMaintenanceBulkUploadError[],
    headerRow = 1,
  ): ServiceMaintenanceBulkUploadResult {
    const headerOrFileError = errors.some(
      (error) => error.row === headerRow || error.column === "file",
    );
    const failedRows = new Set(
      errors
        .filter((error) => error.row > headerRow && error.column !== "file")
        .map((error) => error.row),
    );
    return {
      httpStatus: 400,
      success: false,
      message: "Service maintenance upload validation failed",
      totalRecords,
      insertedRecords: 0,
      duplicateRecords: 0,
      failedRecords: headerOrFileError ? totalRecords : failedRows.size,
      errors,
    };
  }

  private async findVehicle(
    em: EntityManager,
    externalId: string,
  ): Promise<AddVehicle> {
    const vehicle = await em.findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    if (vehicle.status !== undefined && vehicle.status !== Status.ACTIVE) {
      throw new AppError("Vehicle is inactive", 400);
    }
    return vehicle;
  }

  private async findActor(
    em: EntityManager,
    actorUserId?: number,
  ): Promise<Client | undefined> {
    if (actorUserId === undefined) return undefined;
    if (!Number.isSafeInteger(actorUserId) || actorUserId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }
    const actor = await em.findOne(Client, {
      id: actorUserId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private assignFields(
    detail: ServiceMaintenance,
    payload: Partial<CreateServiceMaintenanceDto | UpdateServiceMaintenanceDto>,
  ): void {
    const booleanFields = [
      "odometerIntervalEnabled",
      "engineIntervalEnabled",
      "daysIntervalEnabled",
      "odometerLeftEnabled",
      "engineLeftEnabled",
      "daysLeftEnabled",
      "updateRecord",
      "mobile",
      "allowVisibilityToDriver",
    ] as const;
    for (const field of booleanFields) {
      const value = payload[field];
      if (value !== undefined) {
        detail[field] = value;
      } else if (detail[field] === undefined) {
        detail[field] = false;
      }
    }

    const numberFields = [
      "odometerInterval",
      "lastServiceOdometer",
      "engineInterval",
      "lastServiceEngine",
      "daysInterval",
      "odometerLeft",
      "engineLeft",
      "daysLeft",
    ] as const;
    for (const field of numberFields) {
      const value = payload[field];
      if (value !== undefined) {
        detail[field] = value;
      } else if (detail[field] === undefined) {
        detail[field] = null;
      }
    }

    if (payload.lastServiceDate !== undefined) {
      detail.lastServiceDate = payload.lastServiceDate
        ? new Date(payload.lastServiceDate)
        : null;
    }
  }

  private toResponse(detail: ServiceMaintenance): ServiceMaintenanceResponse {
    return {
      id: detail.externalId,
      serviceName: detail.serviceName,
      vehicle: {
        id: detail.vehicle.externalId,
        vehicle: detail.vehicle.vehicle,
      },
      remark: detail.remark ?? null,
      odometerIntervalEnabled: detail.odometerIntervalEnabled,
      odometerInterval: detail.odometerInterval ?? null,
      lastServiceOdometer: detail.lastServiceOdometer ?? null,
      engineIntervalEnabled: detail.engineIntervalEnabled,
      engineInterval: detail.engineInterval ?? null,
      lastServiceEngine: detail.lastServiceEngine ?? null,
      daysIntervalEnabled: detail.daysIntervalEnabled,
      daysInterval: detail.daysInterval ?? null,
      lastServiceDate: detail.lastServiceDate
        ? new Date(detail.lastServiceDate).toISOString().slice(0, 10)
        : null,
      odometerLeftEnabled: detail.odometerLeftEnabled,
      odometerLeft: detail.odometerLeft ?? null,
      engineLeftEnabled: detail.engineLeftEnabled,
      engineLeft: detail.engineLeft ?? null,
      daysLeftEnabled: detail.daysLeftEnabled,
      daysLeft: detail.daysLeft ?? null,
      updateRecord: detail.updateRecord,
      mobile: detail.mobile,
      serviceDocument: detail.serviceDocument ?? null,
      allowVisibilityToDriver: detail.allowVisibilityToDriver,
      status: detail.status,
      reason: detail.reason ?? null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
