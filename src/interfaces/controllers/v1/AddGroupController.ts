import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateAddGroupDto,
  UpdateAddGroupDto,
} from "../../../domain/dto/AddGroupDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IAddGroupService } from "../../../services/interfaces/IAddGroupService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AddGroupController {
  constructor(
    @inject("IAddGroupService")
    private readonly addGroupService: IAddGroupService,
  ) {}

  getAddGroups = asyncHandler(async (_req: Request, res: Response) => {
    const addGroups = await this.addGroupService.getAddGroups();
    res.status(200).json({
      message: "Add group list fetched successfully",
      data: addGroups,
    });
  });

  getAddGroupById = asyncHandler(async (req: Request, res: Response) => {
    const addGroup = await this.addGroupService.getAddGroupById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Add group fetched successfully",
      data: addGroup,
    });
  });

  createAddGroup = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateAddGroupDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const addGroup = await this.addGroupService.createAddGroup(dto, req.userId);
    res.status(201).json({
      message: "Add group created successfully",
      data: addGroup,
    });
  });

  updateAddGroup = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateAddGroupDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const addGroup = await this.addGroupService.updateAddGroup(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Add group updated successfully",
      data: addGroup,
    });
  });

  deleteAddGroup = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.addGroupService.deleteAddGroup(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Add group deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid add group ID", 400);
    }
    return externalId;
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
