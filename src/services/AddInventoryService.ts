import { EntityManager } from "@mikro-orm/mysql";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import path from "path";
import { inject, injectable } from "tsyringe";
import * as XLSX from "xlsx";
import { logger } from "../configs/logger";
import {
  CreateAddInventoryDto,
  UpdateAddInventoryDto,
} from "../domain/dto/AddInventoryDto";
import { FormError } from "../domain/dto/FormError";
import { AddInventory } from "../domain/entities/mysql/AddInventory";
import { Client } from "../domain/entities/mysql/Client";
import { DeviceType } from "../domain/entities/mysql/DeviceType";
import { Technician } from "../domain/entities/mysql/Technician";
import { AssignType } from "../domain/enums/AssignType";
import { InventoryType } from "../domain/enums/InventoryType";
import { SimOperator } from "../domain/enums/SimOperator";
import { Status } from "../domain/enums/status";
import { IAddInventoryRepository } from "../domain/repositories/mysql/IAddInventoryRepository";
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
  AddInventoryBulkUploadError,
  AddInventoryBulkUploadResult,
  AddInventoryResponse,
  IAddInventoryService,
} from "./interfaces/IAddInventoryService";

const ADD_INVENTORY_EXCEL_COLUMNS = [
  "inventoryType",
  "imei",
  "simNumber",
  "simOperator",
  "secondarySimNumber",
  "secondarySimOperator",
  "deviceType",
  "client",
  "technician",
  "ignitionWireConnected",
  "airConditionWireConnected",
  "analogSensor",
  "status",
  "reason",
] as const;

const ADD_INVENTORY_EXPORT_COLUMNS = [
  "assignType",
  ...ADD_INVENTORY_EXCEL_COLUMNS,
] as const;

const MAX_BULK_WORKSHEET_ROWS = 50_000;
const MAX_BULK_WORKSHEET_COLUMNS = 256;
const MAX_BULK_WORKSHEET_AREA = 1_000_000;

type AddInventoryExcelColumn = (typeof ADD_INVENTORY_EXCEL_COLUMNS)[number];

const booleanExcelColumns = new Set<string>([
  "ignitionWireConnected",
  "airConditionWireConnected",
  "analogSensor",
]);
const stringExcelColumns = new Set([
  "inventoryType",
  "imei",
  "simNumber",
  "simOperator",
  "secondarySimNumber",
  "secondarySimOperator",
  "deviceType",
  "client",
  "technician",
  "status",
  "reason",
]);

interface ParsedBulkRow {
  row: number;
  inventoryType?: InventoryType;
  imei?: string | null;
  simNumber?: string | null;
  simOperator: SimOperator;
  secondarySimNumber?: string | null;
  secondarySimOperator?: SimOperator | null;
  deviceTypeKey: string;
  ignitionWireConnected: boolean;
  airConditionWireConnected: boolean;
  analogSensor: boolean;
  status?: Status | null;
  reason?: string | null;
}

@injectable()
export class AddInventoryService implements IAddInventoryService {
  constructor(
    @inject("IAddInventoryRepository")
    private readonly inventoryRepository: IAddInventoryRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAddInventories(): Promise<AddInventoryResponse[]> {
    const inventories = await this.inventoryRepository.getAddInventories();
    return inventories.map((inventory) => this.toResponse(inventory));
  }

  async getAddInventoryExport(): Promise<Buffer> {
    const records = await this.getAddInventories();
    const rows: unknown[][] = [
      [...ADD_INVENTORY_EXPORT_COLUMNS],
      ...records.map((record) => [
        record.assignType,
        record.inventoryType,
        record.imei ?? "",
        record.simNumber ?? "",
        record.simOperator,
        record.secondarySimNumber ?? "",
        record.secondarySimOperator ?? "",
        record.deviceType.deviceName,
        record.client?.name || record.client?.id || "",
        record.technician?.name || record.technician?.id || "",
        record.ignitionWireConnected,
        record.airConditionWireConnected,
        record.analogSensor,
        record.status ?? "",
        record.reason ?? "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = ADD_INVENTORY_EXPORT_COLUMNS.map((column) => ({
      wch: Math.max(column.length + 2, 20),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Device Inventory");

    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }

  async bulkUploadAddInventories(
    fileName: string,
    fileBuffer: Buffer,
    assignTypeRaw: string,
    clientExternalIdRaw: string,
    technicianExternalIdRaw: string,
    inventoryTypeRaw: string | undefined,
    actorUserId?: number,
  ): Promise<AddInventoryBulkUploadResult> {
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

    const assignType = String(assignTypeRaw ?? "")
      .trim()
      .toLowerCase() as AssignType;
    if (!Object.values(AssignType).includes(assignType)) {
      return this.bulkUploadFailure(0, [
        {
          row: 1,
          column: "assignType",
          message: `assignType must be one of: ${Object.values(AssignType).join(", ")}`,
        },
      ]);
    }

    const formClientExternalId = String(clientExternalIdRaw ?? "").trim();
    const formTechnicianExternalId = String(
      technicianExternalIdRaw ?? "",
    ).trim();

    if (assignType === AssignType.CLIENT) {
      if (!formClientExternalId) {
        return this.bulkUploadFailure(0, [
          {
            row: 1,
            column: "client",
            message: "client is required when assignType is client",
          },
        ]);
      }
      if (formTechnicianExternalId) {
        return this.bulkUploadFailure(0, [
          {
            row: 1,
            column: "technician",
            message: "technician is not allowed when assignType is client",
          },
        ]);
      }
    } else {
      if (!formTechnicianExternalId) {
        return this.bulkUploadFailure(0, [
          {
            row: 1,
            column: "technician",
            message: "technician is required when assignType is technician",
          },
        ]);
      }
      if (formClientExternalId) {
        return this.bulkUploadFailure(0, [
          {
            row: 1,
            column: "client",
            message: "client is not allowed when assignType is technician",
          },
        ]);
      }
    }

    let formInventoryType: InventoryType | undefined;
    if (inventoryTypeRaw !== undefined && String(inventoryTypeRaw).trim()) {
      const normalized = String(inventoryTypeRaw).trim().toLowerCase();
      if (!Object.values(InventoryType).includes(normalized as InventoryType)) {
        return this.bulkUploadFailure(0, [
          {
            row: 1,
            column: "inventoryType",
            message: `inventoryType must be one of: ${Object.values(InventoryType).join(", ")}`,
          },
        ]);
      }
      formInventoryType = normalized as InventoryType;
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
          message: "Inventory upload is busy. Please try again later.",
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
        message: "Unable to parse inventory workbook",
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
    const canonicalColumns = new Map<string, AddInventoryExcelColumn>(
      ADD_INVENTORY_EXCEL_COLUMNS.map((column) => [
        column.toLowerCase(),
        column,
      ]),
    );
    // assignType / client / technician / inventoryType come from the form
    const ignoredUploadHeaders = new Set([
      "assigntype",
      "client",
      "technician",
    ]);
    if (formInventoryType) ignoredUploadHeaders.add("inventorytype");
    const errors: AddInventoryBulkUploadError[] = [];

    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex++) {
      const cell = cells.get(
        XLSX.utils.encode_cell({ r: range.s.r, c: columnIndex }),
      );
      const header = String(cell ?? "").trim();
      if (!header) continue;
      if (ignoredUploadHeaders.has(header.toLowerCase())) continue;

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

    const requiredHeaders: AddInventoryExcelColumn[] = [
      "simOperator",
      "deviceType",
    ];
    if (!formInventoryType) requiredHeaders.push("inventoryType");
    for (const column of requiredHeaders) {
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
      let deviceTypeKey = "";

      for (const column of ADD_INVENTORY_EXCEL_COLUMNS) {
        if (column === "client" || column === "technician") continue;
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

        if (column === "deviceType") {
          deviceTypeKey = this.cellToString(value);
          if (!deviceTypeKey) {
            errors.push({
              row: sourceRow.row,
              column,
              message: "deviceType is required",
            });
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

      if (formInventoryType) {
        record.inventoryType = formInventoryType;
      }

      const dto = plainToInstance(UpdateAddInventoryDto, record, {
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

      const inventoryType =
        (record.inventoryType as InventoryType | undefined) ?? formInventoryType;
      if (!inventoryType) {
        errors.push({
          row: sourceRow.row,
          column: "inventoryType",
          message: "inventoryType is required",
        });
      }

      const simOperator = record.simOperator as SimOperator | undefined;
      if (!simOperator) {
        errors.push({
          row: sourceRow.row,
          column: "simOperator",
          message: "simOperator is required",
        });
      }
      if (!deviceTypeKey) {
        errors.push({
          row: sourceRow.row,
          column: "deviceType",
          message: "deviceType is required",
        });
      }

      if (
        errors.length === errorsBeforeRow &&
        inventoryType &&
        simOperator &&
        deviceTypeKey
      ) {
        parsedRows.push({
          row: sourceRow.row,
          inventoryType,
          imei:
            typeof record.imei === "string" ? record.imei : (record.imei as null),
          simNumber:
            typeof record.simNumber === "string"
              ? record.simNumber
              : (record.simNumber as null),
          simOperator,
          secondarySimNumber:
            typeof record.secondarySimNumber === "string"
              ? record.secondarySimNumber
              : (record.secondarySimNumber as null),
          secondarySimOperator:
            (record.secondarySimOperator as SimOperator | null | undefined) ??
            null,
          deviceTypeKey,
          ignitionWireConnected: Boolean(record.ignitionWireConnected),
          airConditionWireConnected: Boolean(record.airConditionWireConnected),
          analogSensor: Boolean(record.analogSensor),
          status: (record.status as Status | null | undefined) ?? null,
          reason:
            typeof record.reason === "string"
              ? record.reason
              : (record.reason as null),
        });
      }
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    let formClient: Client | undefined;
    let formTechnician: Technician | undefined;
    try {
      const assignment = await this.resolveAssignment(
        assignType,
        formClientExternalId || undefined,
        formTechnicianExternalId || undefined,
      );
      formClient = assignment.client;
      formTechnician = assignment.technician;
    } catch (error) {
      if (error instanceof AppError) {
        const column =
          assignType === AssignType.CLIENT ? "client" : "technician";
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
    const deviceTypeKeys = [
      ...new Set(parsedRows.map((row) => row.deviceTypeKey)),
    ];
    const [deviceTypes, actor] = await Promise.all([
      em.find(DeviceType, {
        isDeleted: false,
        $or: [
          { externalId: { $in: deviceTypeKeys } },
          { deviceName: { $in: deviceTypeKeys } },
        ],
      }),
      this.findActor(actorUserId),
    ]);

    const deviceTypesByKey = new Map<string, DeviceType>();
    for (const deviceType of deviceTypes) {
      deviceTypesByKey.set(deviceType.externalId.toLowerCase(), deviceType);
      deviceTypesByKey.set(
        deviceType.deviceName.trim().toLowerCase(),
        deviceType,
      );
    }

    const details: AddInventory[] = [];
    const rowsForDetails: number[] = [];
    const fileImeiKeys = new Set<string>();
    let duplicateRecords = 0;

    for (const parsedRow of parsedRows) {
      const deviceType = deviceTypesByKey.get(
        parsedRow.deviceTypeKey.toLowerCase(),
      );
      if (!deviceType) {
        errors.push({
          row: parsedRow.row,
          column: "deviceType",
          message: `Device type "${parsedRow.deviceTypeKey}" was not found or has been deleted`,
        });
        continue;
      }

      const imeiKey = parsedRow.imei?.trim().toLowerCase();
      if (imeiKey) {
        if (fileImeiKeys.has(imeiKey)) {
          duplicateRecords += 1;
          continue;
        }
        fileImeiKeys.add(imeiKey);
      }

      const inventory = new AddInventory();
      inventory.inventoryType = parsedRow.inventoryType!;
      inventory.imei = parsedRow.imei ?? null;
      inventory.simNumber = parsedRow.simNumber ?? null;
      inventory.simOperator = parsedRow.simOperator;
      inventory.secondarySimNumber = parsedRow.secondarySimNumber ?? null;
      inventory.secondarySimOperator = parsedRow.secondarySimOperator ?? null;
      inventory.deviceType = deviceType;
      inventory.assignType = assignType;
      inventory.client = formClient;
      inventory.technician = formTechnician;
      inventory.ignitionWireConnected = parsedRow.ignitionWireConnected;
      inventory.airConditionWireConnected =
        parsedRow.airConditionWireConnected;
      inventory.analogSensor = parsedRow.analogSensor;
      inventory.status = parsedRow.status ?? undefined;
      inventory.reason = parsedRow.reason ?? undefined;
      inventory.createdBy = actor;
      details.push(inventory);
      rowsForDetails.push(parsedRow.row);
    }

    if (errors.length > 0) {
      return this.bulkUploadFailure(totalRecords, errors, headerRowNumber);
    }

    try {
      const result =
        await this.inventoryRepository.bulkCreateAddInventories(details);
      return {
        httpStatus: 200,
        success: true,
        message: "Inventory records uploaded successfully",
        totalRecords,
        insertedRecords: result.insertedRecords,
        duplicateRecords: duplicateRecords + result.duplicateRecords,
        failedRecords: 0,
        errors: [],
      };
    } catch (error) {
      logger.error({
        message: "Inventory bulk upload transaction failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalRecords,
      });
      return {
        httpStatus: 500,
        success: false,
        message:
          "Inventory records could not be uploaded; the transaction was rolled back",
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

  async getAddInventoryById(externalId: string): Promise<AddInventoryResponse> {
    const inventory =
      await this.inventoryRepository.getAddInventoryById(externalId);
    if (!inventory) {
      throw new AppError("Inventory not found", 404);
    }
    return this.toResponse(inventory);
  }

  async createAddInventory(
    payload: CreateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse> {
    const em = this.em.fork();
    const deviceType = await em.findOne(DeviceType, {
      externalId: payload.deviceType,
      isDeleted: false,
    });
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }
    const actor = await this.findActor(actorUserId);
    const assignment = await this.resolveAssignment(
      payload.assignType,
      payload.client,
      payload.technician,
    );

    await this.assertImeiUnique(payload.imei);

    const inventory = new AddInventory();
    inventory.inventoryType = payload.inventoryType;
    inventory.imei = payload.imei?.trim() || null;
    inventory.simNumber = payload.simNumber;
    inventory.simOperator = payload.simOperator;
    inventory.secondarySimNumber = payload.secondarySimNumber;
    inventory.secondarySimOperator = payload.secondarySimOperator;
    inventory.deviceType = deviceType;
    inventory.assignType = payload.assignType;
    inventory.client = assignment.client;
    inventory.technician = assignment.technician;
    inventory.password = payload.password;
    inventory.ignitionWireConnected = payload.ignitionWireConnected ?? false;
    inventory.airConditionWireConnected =
      payload.airConditionWireConnected ?? false;
    inventory.analogSensor = payload.analogSensor ?? false;
    inventory.status = payload.status ?? undefined;
    inventory.reason = payload.reason ?? undefined;
    inventory.createdBy = actor;

    return this.toResponse(
      await this.inventoryRepository.createAddInventory(inventory),
    );
  }

  async updateAddInventory(
    externalId: string,
    payload: UpdateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse> {
    const inventory =
      await this.inventoryRepository.getAddInventoryById(externalId);
    if (!inventory) {
      throw new AppError("Inventory not found", 404);
    }

    const em = this.em.fork();
    const deviceType = payload.deviceType
      ? await em.findOne(DeviceType, {
          externalId: payload.deviceType,
          isDeleted: false,
        })
      : inventory.deviceType;
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) inventory.updatedBy = actor;
    const assignType = payload.assignType ?? inventory.assignType;
    const assignmentChanged =
      payload.assignType !== undefined &&
      payload.assignType !== inventory.assignType;
    const assignment =
      payload.assignType !== undefined ||
      payload.client !== undefined ||
      payload.technician !== undefined
        ? await this.resolveAssignment(
            assignType,
            payload.client ??
              (!assignmentChanged ? inventory.client?.externalId : undefined),
            payload.technician ??
              (!assignmentChanged
                ? inventory.technician?.externalId
                : undefined),
          )
        : {
            client: inventory.client,
            technician: inventory.technician,
          };
    if (payload.inventoryType !== undefined) {
      inventory.inventoryType = payload.inventoryType;
    }
    if (payload.imei !== undefined) {
      const nextImei = payload.imei?.trim() || null;
      await this.assertImeiUnique(nextImei, externalId);
      inventory.imei = nextImei;
    }
    if (payload.simNumber !== undefined) {
      inventory.simNumber = payload.simNumber;
    }
    if (payload.simOperator !== undefined) {
      inventory.simOperator = payload.simOperator;
    }
    if (payload.secondarySimNumber !== undefined) {
      inventory.secondarySimNumber = payload.secondarySimNumber;
    }
    if (payload.secondarySimOperator !== undefined) {
      inventory.secondarySimOperator = payload.secondarySimOperator;
    }
    inventory.deviceType = deviceType;
    inventory.assignType = assignType;
    inventory.client = assignment.client;
    inventory.technician = assignment.technician;
    if (payload.password !== undefined) {
      inventory.password = payload.password;
    }
    if (payload.ignitionWireConnected !== undefined) {
      inventory.ignitionWireConnected = payload.ignitionWireConnected;
    }
    if (payload.airConditionWireConnected !== undefined) {
      inventory.airConditionWireConnected = payload.airConditionWireConnected;
    }
    if (payload.analogSensor !== undefined) {
      inventory.analogSensor = payload.analogSensor;
    }
    if (payload.status !== undefined) inventory.status = payload.status;
    if (payload.reason !== undefined) inventory.reason = payload.reason;

    return this.toResponse(
      await this.inventoryRepository.updateAddInventory(inventory),
    );
  }

  async deleteAddInventory(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.inventoryRepository.deleteAddInventory(externalId, actor);
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

  private async assertImeiUnique(
    imei?: string | null,
    excludeExternalId?: string,
  ): Promise<void> {
    const normalized = imei?.trim();
    if (!normalized) {
      return;
    }

    const existing = await this.em.fork().findOne(AddInventory, {
      imei: normalized,
      isDeleted: false,
      ...(excludeExternalId
        ? { externalId: { $ne: excludeExternalId } }
        : {}),
    });
    if (!existing) {
      return;
    }

    const fieldError = new FormError();
    fieldError.field = "imei";
    fieldError.message = "IMEI already exists";
    throw new AppError("IMEI already exists", 400, null, [fieldError]);
  }

  private async resolveAssignment(
    assignType: AssignType,
    clientId?: string,
    technicianId?: string,
  ): Promise<{ client?: Client; technician?: Technician }> {
    const errors: FormError[] = [];
    if (assignType === AssignType.CLIENT) {
      if (!clientId) {
        errors.push(this.assignmentError("client", "Client is required"));
      }
      if (technicianId) {
        errors.push(
          this.assignmentError(
            "technician",
            "Technician is not allowed for client assignment",
          ),
        );
      }
    } else {
      if (!technicianId) {
        errors.push(
          this.assignmentError("technician", "Technician is required"),
        );
      }
      if (clientId) {
        errors.push(
          this.assignmentError(
            "client",
            "Client is not allowed for technician assignment",
          ),
        );
      }
    }

    if (errors.length) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        errors,
      );
    }

    const em = this.em.fork();
    if (assignType === AssignType.CLIENT) {
      if (!clientId) {
        throw new AppError("Client is required", 400);
      }
      const client = await em.findOne(Client, {
        externalId: clientId,
        isDeleted: false,
      });
      if (!client) {
        throw new AppError("Client not found", 404);
      }
      return { client };
    }

    if (!technicianId) {
      throw new AppError("Technician is required", 400);
    }
    const technician = await em.findOne(Technician, {
      externalId: technicianId,
      isDeleted: false,
    });
    if (!technician) {
      throw new AppError("Technician not found", 404);
    }
    return { technician };
  }

  private assignmentError(field: string, message: string): FormError {
    const error = new FormError();
    error.field = field;
    error.message = message;
    return error;
  }

  private cellToString(value: unknown): string {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Number.isSafeInteger(value)
        ? String(value)
        : String(value).trim();
    }
    return String(value ?? "").trim();
  }

  private normalizeBulkExcelCell(
    column: AddInventoryExcelColumn,
    value: unknown,
  ): { value?: unknown; error?: string } {
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

    if (stringExcelColumns.has(column)) {
      const normalized = this.cellToString(value);
      if (!normalized) return { error: "Value must be text" };
      if (
        column === "inventoryType" ||
        column === "status" ||
        column === "simOperator" ||
        column === "secondarySimOperator"
      ) {
        return { value: normalized.toLowerCase() };
      }
      return { value: normalized };
    }

    return { error: "Unsupported Excel column" };
  }

  private bulkUploadFailure(
    totalRecords: number,
    errors: AddInventoryBulkUploadError[],
    headerRow = 1,
  ): AddInventoryBulkUploadResult {
    const headerOrFileError = errors.some(
      (error) =>
        error.row === headerRow ||
        error.column === "file" ||
        error.column === "assignType" ||
        error.column === "client" ||
        error.column === "technician" ||
        error.column === "inventoryType",
    );
    const failedRows = new Set(
      errors
        .filter(
          (error) =>
            error.row > headerRow &&
            error.column !== "file" &&
            error.column !== "assignType" &&
            error.column !== "client" &&
            error.column !== "technician",
        )
        .map((error) => error.row),
    );
    return {
      httpStatus: 400,
      success: false,
      message: "Inventory upload validation failed",
      totalRecords,
      insertedRecords: 0,
      duplicateRecords: 0,
      failedRecords: headerOrFileError ? totalRecords : failedRows.size,
      errors,
    };
  }

  private toResponse(inventory: AddInventory): AddInventoryResponse {
    return {
      id: inventory.externalId,
      inventoryType: inventory.inventoryType,
      imei: inventory.imei ?? null,
      simNumber: inventory.simNumber ?? null,
      simOperator: inventory.simOperator,
      secondarySimNumber: inventory.secondarySimNumber ?? null,
      secondarySimOperator: inventory.secondarySimOperator ?? null,
      deviceType: {
        id: inventory.deviceType.externalId,
        deviceName: inventory.deviceType.deviceName,
      },
      assignType: inventory.assignType,
      client: inventory.client
        ? {
            id: inventory.client.externalId,
            name: inventory.client.name ?? null,
            companyName: inventory.client.companyName,
          }
        : null,
      technician: inventory.technician
        ? {
            id: inventory.technician.externalId,
            name: inventory.technician.name ?? null,
            companyName: inventory.technician.companyName,
          }
        : null,
      ignitionWireConnected: inventory.ignitionWireConnected,
      airConditionWireConnected: inventory.airConditionWireConnected,
      analogSensor: inventory.analogSensor,
      status: inventory.status ?? null,
      reason: inventory.reason ?? null,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }
}
