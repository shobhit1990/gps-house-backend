import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { UpdateRoleMenuPermissionDto } from "../../../domain/dto/RoleMenuPermissionDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IRoleMenuPermissionService } from "../../../services/interfaces/IRoleMenuPermissionService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class RoleMenuPermissionController {
  constructor(
    @inject("IRoleMenuPermissionService")
    private readonly permissionService: IRoleMenuPermissionService,
  ) {}

  getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const page = this.parseQueryInteger(req.query.page, "page");
    const limit = this.parseQueryInteger(req.query.limit, "limit");
    const sort = req.query.sort;
    const search = req.query.search;
    const roleId = req.query.roleId;
    const menuItemId = req.query.menuItemId;

    if (sort !== undefined && sort !== "asc" && sort !== "desc") {
      throw new AppError("Sort must be either 'asc' or 'desc'", 400);
    }
    if (search !== undefined && typeof search !== "string") {
      throw new AppError("Search must be a string", 400);
    }
    if (roleId !== undefined && typeof roleId !== "string") {
      throw new AppError("roleId must be a string", 400);
    }
    if (menuItemId !== undefined && typeof menuItemId !== "string") {
      throw new AppError("menuItemId must be a string", 400);
    }

    const result = await this.permissionService.getPermissions({
      page,
      limit,
      search,
      roleId,
      menuItemId,
      sort: sort as "asc" | "desc" | undefined,
    });

    res.status(200).json({
      ...result,
      message: "Role permissions fetched successfully",
    });
  });

  updatePermission = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      this.assertObjectBody(req.body);
      const dto = plainToInstance(UpdateRoleMenuPermissionDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const permission = await this.permissionService.updatePermission(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Role permission updated successfully",
        data: permission,
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.id;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid role permission ID", 400);
    }
    return externalId.trim();
  }

  private assertObjectBody(body: unknown): void {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("Request body must be a JSON object", 400);
    }
  }

  private parseQueryInteger(value: unknown, field: string): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new AppError(`${field} must be a positive integer`, 400);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new AppError(`${field} must be a positive integer`, 400);
    }
    return parsed;
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(errors),
      );
    }
  }
}
