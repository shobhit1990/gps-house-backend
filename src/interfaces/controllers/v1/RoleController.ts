import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRoleStatusDto,
} from "../../../domain/dto/RoleDto";
import { IRoleService } from "../../../services/interfaces/IRoleService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class RoleController {
  constructor(
    @inject("IRoleService")
    private readonly roleService: IRoleService,
  ) {}

  getRole = asyncHandler(async (_req: Request, res: Response) => {
    const roles = await this.roleService.getRole();
    res.status(200).json({
      data: roles,
      message: "Role list fetched successfully",
    });
  });

  getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const role = await this.roleService.getRoleById(this.getExternalId(req));
    res.status(200).json({
      message: "Role fetched successfully",
      data: role,
    });
  });

  getRoleByCode = asyncHandler(async (req: Request, res: Response) => {
    const roleCode = req.params.roleCode;
    if (typeof roleCode !== "string" || !roleCode.trim()) {
      throw new AppError("Invalid role code", 400);
    }
    const role = await this.roleService.getRoleByRoleCode(roleCode);
    res.status(200).json({
      message: "Role fetched successfully",
      data: role,
    });
  });

  createRole = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(CreateRoleDto, req.body);
    await this.validateDto(dto);
    const role = await this.roleService.createRole(dto);
    res.status(201).json({
      message: "Role created successfully",
      data: {
        id: role.externalId,
        roleCode: role.roleCode,
        name: role.name,
        status: role.status,
        reason: role.reason ?? null,
      },
    });
  });

  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(UpdateRoleDto, req.body);
    await this.validateDto(dto);
    const role = await this.roleService.updateRole(
      this.getExternalId(req),
      dto,
    );
    res.status(200).json({
      message: "Role updated successfully",
      data: {
        id: role.externalId,
        roleCode: role.roleCode,
        name: role.name,
        status: role.status,
        reason: role.reason ?? null,
      },
    });
  });

  updateRoleStatus = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(UpdateRoleStatusDto, req.body);
    await this.validateDto(dto);
    const role = await this.roleService.updateRoleStatus(
      this.getExternalId(req),
      dto.status,
      dto.reason,
    );
    res.status(200).json({
      message: "Role status updated successfully",
      data: {
        id: role.externalId,
        status: role.status,
        reason: role.reason ?? null,
      },
    });
  });

  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    await this.roleService.deleteRole(this.getExternalId(req));
    res.status(200).json({
      message: "Role deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid role ID", 400);
    }
    return externalId.trim();
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
