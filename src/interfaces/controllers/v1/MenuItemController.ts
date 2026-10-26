import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import { MenuItemUpdateDto } from "../../../domain/dto/MenuItemUpdateDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { MenuType } from "../../../domain/enums/MenuType";
import { IMenuItemService } from "../../../services/interfaces/IMenuItemService";
import {
  formatValidationErrors,
  safeTransform,
} from "../../../utils/commonFunctions";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";

@injectable()
export class MenuItemController {
  constructor(
    @inject("IMenuItemService")
    private readonly menuItemService: IMenuItemService,
  ) {}

  getUserMenus = asyncHandler(async (req: Request, res: Response) => {
    const requestedTypes = req.query.menuType;
    let allowedMenuTypes: MenuType[] | undefined;
    if (requestedTypes !== undefined) {
      const values = Array.isArray(requestedTypes)
        ? requestedTypes
        : String(requestedTypes).split(",");
      if (
        !values.every(
          (value) =>
            typeof value === "string" &&
            Object.values(MenuType).includes(value as MenuType),
        )
      ) {
        throw new AppError("Invalid menu type", 400);
      }
      allowedMenuTypes = values as MenuType[];
    }

    const requestedIncludeAll = req.query.includeAllMenus;
    if (
      requestedIncludeAll !== undefined &&
      requestedIncludeAll !== "true" &&
      requestedIncludeAll !== "false"
    ) {
      throw new AppError(
        "includeAllMenus must be either 'true' or 'false'",
        400,
      );
    }

    const menuItems = await this.menuItemService.getUserMenus({
      allowedMenuTypes,
      includeAllMenus: requestedIncludeAll === "true",
    });
    res
      .status(200)
      .json({ data: menuItems, message: "Menu list fetched successfully" });
  });

  getMenuItems = asyncHandler(async (_req: Request, res: Response) => {
    const menuItems = await this.menuItemService.getMenuItems();
    res.status(200).json({
      data: safeTransform(menuItems),
      message: "Menu list fetched successfully",
    });
  });

  getMenuItemsPaginated = asyncHandler(async (req: Request, res: Response) => {
    const page = this.parseQueryInteger(req.query.page, "page");
    const limit = this.parseQueryInteger(req.query.limit, "limit");
    const sort = req.query.sort;
    const search = req.query.search;
    if (sort !== undefined && sort !== "asc" && sort !== "desc") {
      throw new AppError("Sort must be either 'asc' or 'desc'", 400);
    }
    if (search !== undefined && typeof search !== "string") {
      throw new AppError("Search must be a string", 400);
    }

    const result = await this.menuItemService.getMenuItemsPaginated({
      page,
      limit,
      search,
      sort: sort as "asc" | "desc" | undefined,
    });
    res.status(200).json({
      ...result,
      data: safeTransform(result.data),
      message: "Menu list fetched successfully",
    });
  });

  getMenuItemById = asyncHandler(async (req: Request, res: Response) => {
    const externalId = this.parseExternalId(req.params.externalId);
    const menuItem = await this.menuItemService.getMenuItemById(externalId);
    res.status(200).json({
      data: safeTransform(menuItem),
      message: "Menu item fetched successfully",
    });
  });

  updateMenuItem = asyncHandler(async (req: CustomRequest, res: Response) => {
    const externalId = this.parseExternalId(req.params.externalId);
    this.assertObjectBody(req.body);

    const dto = plainToInstance(MenuItemUpdateDto, req.body);
    const validationErrors = await validate(dto, { whitelist: true });
    if (validationErrors.length > 0) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(validationErrors),
      );
    }
    if (Object.keys(dto).length === 0) {
      throw new AppError("At least one menu item field is required", 400);
    }

    const menuItem = await this.menuItemService.updateMenuItem(
      externalId,
      dto,
      Number.isSafeInteger(req.userId) && req.userId > 0
        ? req.userId
        : undefined,
    );
    res.status(200).json({
      data: safeTransform(menuItem),
      message: "Menu item updated successfully",
    });
  });

  private parseExternalId(value: string | string[]): string {
    const externalId = Array.isArray(value) ? value[0] : value;
    if (!externalId?.trim()) {
      throw new AppError("Invalid menu item ID", 400);
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
}
