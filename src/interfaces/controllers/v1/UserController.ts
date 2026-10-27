import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Response } from "express";
import { inject, injectable } from "tsyringe";
import { AddUserDto, UpdateUserDto } from "../../../domain/dto/AddUserDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IUserService } from "../../../services/interfaces/IUserService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class UserController {
  constructor(
    @inject("IUserService")
    private readonly userService: IUserService,
  ) {}

  getUsers = asyncHandler(async (_req: CustomRequest, res: Response) => {
    const users = await this.userService.getUsers();
    res.status(200).json({
      message: "User list fetched successfully",
      data: users.map((user) => this.toResponse(user)),
    });
  });

  getUserById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const user = await this.userService.getUserById(this.getExternalId(req));
    res.status(200).json({
      message: "User fetched successfully",
      data: this.toResponse(user),
    });
  });

  addUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = await this.validateDto(AddUserDto, req.body);
    const user = await this.userService.addUser(dto, req.userId);
    res.status(201).json({
      message: "User created successfully",
      data: this.toResponse(user),
    });
  });

  updateUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = await this.validateDto(UpdateUserDto, req.body);
    const user = await this.userService.updateUser(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "User updated successfully",
      data: this.toResponse(user),
    });
  });

  deleteUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.userService.deleteUser(this.getExternalId(req), req.userId);
    res.status(200).json({ message: "User deleted successfully" });
  });

  private getExternalId(req: CustomRequest): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid user ID", 400);
    }
    return externalId;
  }

  private async validateDto<T extends object>(
    dtoType: new () => T,
    body: unknown,
  ): Promise<T> {
    const dto = plainToInstance(dtoType, body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(errors),
      );
    }
    return dto;
  }

  private toResponse(user: Awaited<ReturnType<IUserService["getUserById"]>>) {
    return {
      id: user.externalId,
      userName: user.userName,
      group: {
        id: user.group.externalId,
        groupName: user.group.groupName,
      },
      timezone: {
        id: user.timezone.externalId,
        timeZone: user.timezone.timeZone,
      },
      companyName: user.companyName,
      contactPersonName: user.contactPersonName ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      companyAddress: user.companyAddress ?? null,
      dataRestrictionDays: user.dataRestrictionDays ?? null,
      isSchoolUser: user.isSchoolUser,
      status: user.status,
      reason: user.reason ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
