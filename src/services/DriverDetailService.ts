import { EntityManager } from "@mikro-orm/mysql";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import path from "path";
import { inject, injectable } from "tsyringe";
import * as XLSX from "xlsx";
import { logger } from "../configs/logger";
import {
  CreateDriverDetailDto,
  UpdateDriverDetailDto,
} from "../domain/dto/DriverDetailDto";
import { Client } from "../domain/entities/mysql/Client";
import { DriverDetail } from "../domain/entities/mysql/DriverDetail";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { License } from "../domain/entities/mysql/License";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { IDriverDetailRepository } from "../domain/repositories/mysql/IDriverDetailRepository";
import { AppError } from "../utils/errors";
import {
  ParsedServiceMaintenanceWorksheet,
  WorkbookParserBusyError,
  parseServiceMaintenanceWorkbook,
} from "../utils/parseServiceMaintenanceWorkbook";
import {
  assertZipUncompressedSizeWithinLimit,
  isZipArchive,
} from "../utils/zipArchive";
import {
  DriverDetailBulkUploadError,
  DriverDetailBulkUploadResult,
  DriverDetailResponse,
  IDriverDetailService,
} from "./interfaces/IDriverDetailService";

const DRIVER_DETAIL_EXCEL_COLUMNS = [
  "firstName",
  "lastName",
  "deviceId",
  "dateOfJoining",
  "dateOfLeaving",
  "dateOfBirth",
  "experience",
  "salary",
  "phoneNumber",
  "licenseNumber",
  "licenseToDrive",
  "licenseIssueDate",
  "licenseExpiryDate",
  "lifeInsuranceNumber",
  "lifeInsuranceExpiryDate",
  "mediclaimNumber",
  "mediclaimExpiryDate",
  "bloodGroup",
  "supervisorName",
  "supervisorPhoneNumber",
  "address",
  "licenseAvailable",
  "licenseVerified",
  "enableGeoVerifiedAttendance",
  "geofences",
  "status",
  "reason",
] as const;

const DRIVER_DETAIL_EXPORT_COLUMNS = [
  "client",
  "transporter",
  ...DRIVER_DETAIL_EXCEL_COLUMNS,
] as const;

const MAX_BULK_WORKSHEET_ROWS = 50_000;
const MAX_BULK_WORKSHEET_COLUMNS = 256;
const MAX_BULK_WORKSHEET_AREA = 1_000_000;

type DriverDetailExcelColumn = (typeof DRIVER_DETAIL_EXCEL_COLUMNS)[number];

const booleanExcelColumns = new Set<string>([
  "licenseAvailable",
  "licenseVerified",
  "enableGeoVerifiedAttendance",
]);
const numericExcelColumns = new Set<string>(["experience", "salary"]);
const dateExcelColumns = new Set<string>([
  "dateOfJoining",
  "dateOfLeaving",
  "dateOfBirth",
  "licenseIssueDate",
  "licenseExpiryDate",
  "lifeInsuranceExpiryDate",
  "mediclaimExpiryDate",
]);
const arrayExcelColumns = new Set<string>(["licenseToDrive", "geofences"]);
const stringExcelColumns = new Set([
  "firstName",
  "lastName",
  "deviceId",
  "phoneNumber",
  "licenseNumber",
  "lifeInsuranceNumber",
  "mediclaimNumber",
  "bloodGroup",
  "supervisorName",
  "supervisorPhoneNumber",
  "address",
  "status",
  "reason",
]);

interface ParsedBulkRow {
  row: number;
  dto: UpdateDriverDetailDto;
  firstName: string;
  lastName: string;
  licenseToDriveKeys: string[];
  geofenceKeys: string[];
}

@injectable()
export class DriverDetailService implements IDriverDetailService {
  constructor(
    @inject("IDriverDetailRepository")
    private readonly driverDetailRepository: IDriverDetailRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getDriverDetails(): Promise<DriverDetailResponse[]> {
    const details = await this.driverDetailRepository.getDriverDetails();
    return details.map((detail) => this.toResponse(detail));
  }

  async getDriverDetailExport(): Promise<Buffer> {
    const records = await this.getDriverDetails();
    const rows: unknown[][] = [
      [...DRIVER_DETAIL_EXPORT_COLUMNS],
      ...records.map((record) => [
        record.client.name || record.client.id,
        record.transporter
          ? record.transporter.name || record.transporter.id
          : "",
        record.firstName,
        record.lastName,
        record.deviceId ?? "",
        this.toExportDate(record.dateOfJoining),
        this.toExportDate(record.dateOfLeaving),
        this.toExportDate(record.dateOfBirth),
        record.experience ?? "",
        record.salary ?? "",
        record.phoneNumber ?? "",
        record.licenseNumber ?? "",
        record.licenseToDrive.map((license) => license.license).join(", "),
        this.toExportDate(record.licenseIssueDate),
        this.toExportDate(record.licenseExpiryDate),
        record.lifeInsuranceNumber ?? "",
        this.toExportDate(record.lifeInsuranceExpiryDate),
        record.mediclaimNumber ?? "",
        this.toExportDate(record.mediclaimExpiryDate),
        record.bloodGroup ?? "",
        record.supervisorName ?? "",
        record.supervisorPhoneNumber ?? "",
        record.address ?? "",
        record.licenseAvailable,
        record.licenseVerified,
        record.enableGeoVerifiedAttendance,
        record.geofences.map((geofence) => geofence.name).join(", "),
        record.status ?? "",
        record.reason ?? "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = DRIVER_DETAIL_EXPORT_COLUMNS.map((column) => ({
      wch: Math.max(column.length + 2, 20),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Detail");

    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }

  async bulkUploadDriverDetails(
    fileName: string,
    fileBuffer: Buffer,
    clientExternalId: string,
    transporterExternalId: string,
    actorExternalId?: string,
  ): Promise<DriverDetailBulkUploadResult> {
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

    if (!clientExternalId?.trim()) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "client",
          message: "client is required",
        },
      ]);
    }
    if (!transporterExternalId?.trim()) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "transporter",
          message: "transporter is required",
        },
      ]);
    }

    let parsedWorksheet: ParsedServiceMaintenanceWorksheet;
    try {
      const isZip = isZipArchive(fileBuffer);
      if (extension === ".xlsx" && !isZip) {
        throw new Error("The .xlsx file is not a valid ZIP archive");
      }
      if (isZip) {
        assertZipUncompressedSizeWithinLimit(fileBuffer);
      }
      parsedWorksheet = await parseServiceMaintenanceWorkbook(fileBuffer);
    } catch (error) {
      if (error instanceof WorkbookParserBusyError) {
        return {
          httpStatus: 503,
          success: false,
          message: "Driver detail upload is busy. Please try again later.",
          totalRecords: 0,
          insertedRecords: 0,
          duplicateRecords: 0,
          failedRecords: 0,
          errors: [
            {
              row: 1,
              column: "file",
              message: error.message,
            },
          ],
        };
      }

      logger.error({
        message: "Unable to parse driver detail workbook",
        error: error instanceof Error ? error.message : String(error),
      });
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message:
            error instanceof Error
              ? error.message
              : "Unable to read Excel file",
        },
      ]);
    }

    const sheetRef = parsedWorksheet.sheetRef;
    if (!parsedWorksheet.sheetName || !sheetRef) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message: "The workbook's first worksheet is missing or empty",
        },
      ]);
    }

    const cells = new Map(parsedWorksheet.cells);
    const range = XLSX.utils.decode_range(sheetRef);
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;
    if (
      !Number.isInteger(range.s.r) ||
      !Number.isInteger(range.e.r) ||
      !Number.isInteger(range.s.c) ||
      !Number.isInteger(range.e.c) ||
      range.s.r < 0 ||
      range.s.c < 0 ||
      rowCount < 1 ||
      columnCount < 1 ||
      rowCount > MAX_BULK_WORKSHEET_ROWS ||
      columnCount > MAX_BULK_WORKSHEET_COLUMNS ||
      rowCount * columnCount > MAX_BULK_WORKSHEET_AREA
    ) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "file",
          message:
            "The first worksheet exceeds the supported row or column limits",
        },
      ]);
    }

    const headerRowNumber = range.s.r + 1;
    const headerIndexes = new Map<string, number>();
    const canonicalColumns = new Map<string, DriverDetailExcelColumn>(
      DRIVER_DETAIL_EXCEL_COLUMNS.map((column) => [
        column.toLowerCase(),
        column,
      ]),
    );
    const errors: DriverDetailBulkUploadError[] = [];

    const ignoredUploadHeaders = new Set(["client", "transporter"]);

    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex++) {
      const cell = cells.get(
        XLSX.utils.encode_cell({ r: range.s.r, c: columnIndex }),
      );
      const header = String(cell ?? "").trim();
      if (!header) continue;

      if (ignoredUploadHeaders.has(header.toLowerCase())) {
        continue;
      }

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

    for (const column of ["firstName", "lastName"] as const) {
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
        const value =
          cells.get(XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })) ??
          "";
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
      let licenseToDriveKeys: string[] = [];
      let geofenceKeys: string[] = [];

      for (const column of DRIVER_DETAIL_EXCEL_COLUMNS) {
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

        if (arrayExcelColumns.has(column)) {
          if (typeof value !== "string" && typeof value !== "number") {
            errors.push({
              row: sourceRow.row,
              column,
              message: "Value must be text",
            });
            continue;
          }
          const keys = String(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          if (column === "licenseToDrive") licenseToDriveKeys = keys;
          else geofenceKeys = keys;
          continue;
        }

        const normalized = this.normalizeBulkExcelCell(
          column,
          value,
          parsedWorksheet.date1904,
        );
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

      const dto = plainToInstance(UpdateDriverDetailDto, record, {
        enableImplicitConversion: true,
      });
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

      const firstName =
        typeof record.firstName === "string" ? record.firstName.trim() : "";
      const lastName =
        typeof record.lastName === "string" ? record.lastName.trim() : "";
      if (!firstName) {
        errors.push({
          row: sourceRow.row,
          column: "firstName",
          message: "firstName is required",
        });
      }
      if (!lastName) {
        errors.push({
          row: sourceRow.row,
          column: "lastName",
          message: "lastName is required",
        });
      }

      if (errors.length === errorsBeforeRow && firstName && lastName) {
        parsedRows.push({
          row: sourceRow.row,
          dto,
          firstName,
          lastName,
          licenseToDriveKeys,
          geofenceKeys,
        });
      }
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    let client: Client;
    let transporter: Transporter;
    let actor: Client | undefined;
    try {
      [client, transporter, actor] = await Promise.all([
        this.findClient(clientExternalId.trim()),
        this.findTransporterRequired(transporterExternalId.trim()),
        this.findActor(actorExternalId),
      ]);
    } catch (error) {
      if (error instanceof AppError) {
        const column =
          error.message.toLowerCase().includes("transporter")
            ? "transporter"
            : error.message.toLowerCase().includes("client")
              ? "client"
              : "file";
        return this.bulkUploadFailure(totalRecords, [
          {
            row: 1,
            column,
            message: error.message,
          },
        ]);
      }
      throw error;
    }

    const em = this.em.fork();
    const licenseKeys = [
      ...new Set(parsedRows.flatMap((row) => row.licenseToDriveKeys)),
    ];
    const geofenceKeys = [
      ...new Set(parsedRows.flatMap((row) => row.geofenceKeys)),
    ];
    const [licenses, geofences] = await Promise.all([
      licenseKeys.length
        ? em.find(License, {
            isDeleted: false,
            $or: [
              { externalId: { $in: licenseKeys } },
              { license: { $in: licenseKeys } },
            ],
          })
        : Promise.resolve([] as License[]),
      geofenceKeys.length
        ? em.find(Geofence, {
            isDeleted: false,
            $or: [
              { externalId: { $in: geofenceKeys } },
              { name: { $in: geofenceKeys } },
            ],
          })
        : Promise.resolve([] as Geofence[]),
    ]);

    const licensesByKey = new Map<string, License>();
    for (const license of licenses) {
      licensesByKey.set(license.externalId.toLowerCase(), license);
      licensesByKey.set(license.license.trim().toLowerCase(), license);
    }
    const geofencesByKey = new Map<string, Geofence>();
    for (const geofence of geofences) {
      geofencesByKey.set(geofence.externalId.toLowerCase(), geofence);
      geofencesByKey.set(geofence.name.trim().toLowerCase(), geofence);
    }

    const details: DriverDetail[] = [];
    const rowsForDetails: number[] = [];

    for (const parsedRow of parsedRows) {
      const rowLicenses: License[] = [];
      let rowHasError = false;
      for (const key of parsedRow.licenseToDriveKeys) {
        const license = licensesByKey.get(key.toLowerCase());
        if (!license) {
          errors.push({
            row: parsedRow.row,
            column: "licenseToDrive",
            message: `License "${key}" was not found or has been deleted`,
          });
          rowHasError = true;
          continue;
        }
        if (!rowLicenses.some((item) => item.id === license.id)) {
          rowLicenses.push(license);
        }
      }

      const rowGeofences: Geofence[] = [];
      for (const key of parsedRow.geofenceKeys) {
        const geofence = geofencesByKey.get(key.toLowerCase());
        if (!geofence) {
          errors.push({
            row: parsedRow.row,
            column: "geofences",
            message: `Geofence "${key}" was not found or has been deleted`,
          });
          rowHasError = true;
          continue;
        }
        if (!rowGeofences.some((item) => item.id === geofence.id)) {
          rowGeofences.push(geofence);
        }
      }
      if (rowHasError) continue;

      const detail = new DriverDetail();
      detail.client = client;
      detail.transporter = transporter;
      detail.firstName = parsedRow.firstName;
      detail.lastName = parsedRow.lastName;
      detail.licenseToDrive.set(rowLicenses);
      detail.geofences.set(rowGeofences);
      detail.createdBy = actor;
      this.assignOptionalFields(detail, {
        ...parsedRow.dto,
        firstName: parsedRow.firstName,
        lastName: parsedRow.lastName,
      });
      if (detail.status === undefined) detail.status = Status.ACTIVE;
      details.push(detail);
      rowsForDetails.push(parsedRow.row);
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    try {
      const result =
        await this.driverDetailRepository.bulkCreateDriverDetails(details);
      return {
        httpStatus: 200,
        success: true,
        message: "Driver detail records uploaded successfully",
        totalRecords,
        insertedRecords: result.insertedRecords,
        duplicateRecords: 0,
        failedRecords: 0,
        errors: [],
      };
    } catch (error) {
      logger.error({
        message: "Driver detail bulk upload transaction failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalRecords,
      });
      return {
        httpStatus: 500,
        success: false,
        message:
          "Driver detail records could not be uploaded; the transaction was rolled back",
        totalRecords,
        insertedRecords: 0,
        duplicateRecords: 0,
        failedRecords: details.length,
        errors: rowsForDetails.map((row) => ({
          row,
          column: "record",
          message: "Database transaction failed; no records were inserted",
        })),
      };
    }
  }

  async getDriverDetailById(externalId: string): Promise<DriverDetailResponse> {
    const detail =
      await this.driverDetailRepository.getDriverDetailById(externalId);
    if (!detail) {
      throw new AppError("Driver detail not found", 404);
    }
    return this.toResponse(detail);
  }

  async createDriverDetail(
    payload: CreateDriverDetailDto,
    actorExternalId?: string,
  ): Promise<DriverDetailResponse> {
    const [client, transporter, licenses, geofences, actor] = await Promise.all(
      [
        this.findClient(payload.client),
        this.findTransporter(payload.transporter),
        this.findLicenses(payload.licenseToDrive),
        this.findGeofences(payload.geofences),
        this.findActor(actorExternalId),
      ],
    );

    const detail = new DriverDetail();
    detail.client = client;
    detail.transporter = transporter;
    detail.firstName = payload.firstName;
    detail.lastName = payload.lastName;
    detail.licenseToDrive.set(licenses);
    detail.geofences.set(geofences);
    detail.createdBy = actor;
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.driverDetailRepository.createDriverDetail(detail),
    );
  }

  async updateDriverDetail(
    externalId: string,
    payload: UpdateDriverDetailDto,
    actorExternalId?: string,
  ): Promise<DriverDetailResponse> {
    const detail =
      await this.driverDetailRepository.getDriverDetailById(externalId);
    if (!detail) {
      throw new AppError("Driver detail not found", 404);
    }

    const [client, transporter, licenses, geofences, actor] = await Promise.all(
      [
        payload.client ? this.findClient(payload.client) : detail.client,
        payload.transporter !== undefined
          ? this.findTransporter(payload.transporter)
          : detail.transporter,
        payload.licenseToDrive !== undefined
          ? this.findLicenses(payload.licenseToDrive)
          : detail.licenseToDrive.getItems(),
        payload.geofences !== undefined
          ? this.findGeofences(payload.geofences)
          : detail.geofences
              .getItems()
              .filter((geofence) => !geofence.isDeleted),
        this.findActor(actorExternalId),
      ],
    );

    detail.client = client;
    detail.transporter = transporter;
    detail.licenseToDrive.set(licenses);
    detail.geofences.set(geofences);
    detail.updatedBy = actor;
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.driverDetailRepository.updateDriverDetail(detail),
    );
  }

  async deleteDriverDetail(
    externalId: string,
    actorExternalId?: string,
  ): Promise<void> {
    const actor = await this.findActor(actorExternalId);
    await this.driverDetailRepository.deleteDriverDetail(externalId, actor);
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

  private async findTransporter(
    externalId?: string | null,
  ): Promise<Transporter | undefined> {
    if (!externalId) return undefined;
    return this.findTransporterRequired(externalId);
  }

  private async findTransporterRequired(
    externalId: string,
  ): Promise<Transporter> {
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
  }

  private async findLicenses(externalIds?: string[]): Promise<License[]> {
    if (!externalIds?.length) return [];
    const licenses = await this.em.fork().find(License, {
      externalId: { $in: externalIds },
      isDeleted: false,
    });
    if (licenses.length !== new Set(externalIds).size) {
      throw new AppError("Invalid licenseToDrive externalId", 400);
    }
    return licenses;
  }

  private async findGeofences(externalIds?: string[]): Promise<Geofence[]> {
    if (!externalIds?.length) return [];
    const geofences = await this.em.fork().find(Geofence, {
      externalId: { $in: externalIds },
      isDeleted: false,
    });
    if (geofences.length !== new Set(externalIds).size) {
      throw new AppError("Invalid geofences externalId", 400);
    }
    return geofences;
  }

  private async findActor(
    userExternalId?: string,
  ): Promise<Client | undefined> {
    if (userExternalId === undefined) return undefined;
    if (typeof userExternalId !== "string" || !userExternalId.trim()) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const user = await em.findOne(User, {
      externalId: userExternalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Admin/users may exist without a Client row; createdBy/updatedBy stay unset.
    const actor = await em.findOne(Client, {
      externalId: user.externalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    return actor ?? undefined;
  }

  private assignOptionalFields(
    detail: DriverDetail,
    payload: CreateDriverDetailDto | UpdateDriverDetailDto,
  ): void {
    if (payload.firstName !== undefined) detail.firstName = payload.firstName;
    if (payload.lastName !== undefined) detail.lastName = payload.lastName;
    if (payload.deviceId !== undefined) {
      detail.deviceId = payload.deviceId;
    }
    if (payload.dateOfJoining !== undefined) {
      detail.dateOfJoining = this.toDate(payload.dateOfJoining);
    }
    if (payload.dateOfLeaving !== undefined) {
      detail.dateOfLeaving = this.toDate(payload.dateOfLeaving);
    }
    if (payload.dateOfBirth !== undefined) {
      detail.dateOfBirth = this.toDate(payload.dateOfBirth);
    }
    if (payload.experience !== undefined) detail.experience = payload.experience;
    if (payload.salary !== undefined) detail.salary = payload.salary;
    if (payload.phoneNumber !== undefined) {
      detail.phoneNumber = payload.phoneNumber;
    }
    if (payload.licenseNumber !== undefined) {
      detail.licenseNumber = payload.licenseNumber;
    }
    if (payload.licenseIssueDate !== undefined) {
      detail.licenseIssueDate = this.toDate(payload.licenseIssueDate);
    }
    if (payload.licenseExpiryDate !== undefined) {
      detail.licenseExpiryDate = this.toDate(payload.licenseExpiryDate);
    }
    if (payload.lifeInsuranceNumber !== undefined) {
      detail.lifeInsuranceNumber = payload.lifeInsuranceNumber;
    }
    if (payload.lifeInsuranceExpiryDate !== undefined) {
      detail.lifeInsuranceExpiryDate = this.toDate(
        payload.lifeInsuranceExpiryDate,
      );
    }
    if (payload.mediclaimNumber !== undefined) {
      detail.mediclaimNumber = payload.mediclaimNumber;
    }
    if (payload.mediclaimExpiryDate !== undefined) {
      detail.mediclaimExpiryDate = this.toDate(payload.mediclaimExpiryDate);
    }
    if (payload.bloodGroup !== undefined) {
      detail.bloodGroup = payload.bloodGroup;
    }
    if (payload.supervisorName !== undefined) {
      detail.supervisorName = payload.supervisorName;
    }
    if (payload.supervisorPhoneNumber !== undefined) {
      detail.supervisorPhoneNumber = payload.supervisorPhoneNumber;
    }
    if (payload.address !== undefined) detail.address = payload.address;
    if (payload.licenseAvailable !== undefined) {
      detail.licenseAvailable = payload.licenseAvailable;
    }
    if (payload.licenseVerified !== undefined) {
      detail.licenseVerified = payload.licenseVerified;
    }
    if (payload.enableGeoVerifiedAttendance !== undefined) {
      detail.enableGeoVerifiedAttendance = payload.enableGeoVerifiedAttendance;
    }
    if (payload.status !== undefined) detail.status = payload.status;
    if (payload.reason !== undefined) detail.reason = payload.reason;
  }

  private toDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  }

  private toExportDate(value?: Date | null): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  private normalizeBulkExcelCell(
    column: DriverDetailExcelColumn,
    value: unknown,
    date1904 = false,
  ): { value?: unknown; error?: string } {
    if (stringExcelColumns.has(column)) {
      if (typeof value !== "string" && typeof value !== "number") {
        return { error: "Value must be text" };
      }
      const normalized = String(value).trim();
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
      return { value: normalized };
    }

    if (dateExcelColumns.has(column)) {
      const date = this.normalizeBulkExcelDate(value, date1904);
      return date ? { value: date } : { error: "Value must be a valid date" };
    }

    return { error: "Unsupported Excel column" };
  }

  private normalizeBulkExcelDate(
    value: unknown,
    date1904: boolean,
  ): string | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      const parts = XLSX.SSF.parse_date_code(value, { date1904 });
      if (parts && parts.y >= 1 && parts.y <= 9999) {
        return this.toBulkDateString(parts.y, parts.m, parts.d);
      }
      return undefined;
    }
    if (typeof value !== "string") return undefined;

    const text = value.trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
    const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (isoDate) {
      if (text.length > 10 && Number.isNaN(Date.parse(text))) return undefined;
      return this.toBulkDateString(
        Number(isoDate[1]),
        Number(isoDate[2]),
        Number(isoDate[3]),
      );
    }
    if (slashDate) {
      // Prefer DD/MM/YYYY (as shown in the UI); fall back to MM/DD/YYYY when day > 12.
      const first = Number(slashDate[1]);
      const second = Number(slashDate[2]);
      const year = Number(slashDate[3]);
      if (first > 12) {
        return this.toBulkDateString(year, second, first);
      }
      if (second > 12) {
        return this.toBulkDateString(year, first, second);
      }
      return this.toBulkDateString(year, second, first);
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
    errors: DriverDetailBulkUploadError[],
    headerRow = 1,
  ): DriverDetailBulkUploadResult {
    const headerOrFileError = errors.some(
      (error) =>
        error.row === headerRow ||
        error.column === "file" ||
        error.column === "client" ||
        error.column === "transporter",
    );
    const failedRows = new Set(
      errors
        .filter(
          (error) =>
            error.row > headerRow &&
            error.column !== "file" &&
            error.column !== "client" &&
            error.column !== "transporter",
        )
        .map((error) => error.row),
    );
    return {
      httpStatus: 400,
      success: false,
      message: "Driver detail upload validation failed",
      totalRecords,
      insertedRecords: 0,
      duplicateRecords: 0,
      failedRecords: headerOrFileError ? totalRecords : failedRows.size,
      errors,
    };
  }

  private toResponse(detail: DriverDetail): DriverDetailResponse {
    return {
      id: detail.externalId,
      client: {
        id: detail.client.externalId,
        name: detail.client.name ?? null,
        companyName: detail.client.companyName,
      },
      transporter: detail.transporter
        ? {
            id: detail.transporter.externalId,
            name: detail.transporter.name ?? null,
            companyName: detail.transporter.companyName,
          }
        : null,
      firstName: detail.firstName,
      lastName: detail.lastName,
      deviceId: detail.deviceId ?? null,
      dateOfJoining: detail.dateOfJoining ?? null,
      dateOfLeaving: detail.dateOfLeaving ?? null,
      dateOfBirth: detail.dateOfBirth ?? null,
      experience: detail.experience ?? null,
      salary: detail.salary ?? null,
      phoneNumber: detail.phoneNumber ?? null,
      licenseNumber: detail.licenseNumber ?? null,
      licenseToDrive: detail.licenseToDrive
        .getItems()
        .filter((license) => !license.isDeleted)
        .map((license) => ({
          id: license.externalId,
          license: license.license,
        })),
      licenseIssueDate: detail.licenseIssueDate ?? null,
      licenseExpiryDate: detail.licenseExpiryDate ?? null,
      lifeInsuranceNumber: detail.lifeInsuranceNumber ?? null,
      lifeInsuranceExpiryDate: detail.lifeInsuranceExpiryDate ?? null,
      mediclaimNumber: detail.mediclaimNumber ?? null,
      mediclaimExpiryDate: detail.mediclaimExpiryDate ?? null,
      bloodGroup: detail.bloodGroup ?? null,
      supervisorName: detail.supervisorName ?? null,
      supervisorPhoneNumber: detail.supervisorPhoneNumber ?? null,
      address: detail.address ?? null,
      licenseAvailable: detail.licenseAvailable,
      licenseVerified: detail.licenseVerified,
      enableGeoVerifiedAttendance: detail.enableGeoVerifiedAttendance,
      geofences: detail.geofences
        .getItems()
        .filter((geofence) => !geofence.isDeleted)
        .map((geofence) => ({
          id: geofence.externalId,
          name: geofence.name,
        })),
      status: detail.status ?? null,
      reason: detail.reason ?? null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
