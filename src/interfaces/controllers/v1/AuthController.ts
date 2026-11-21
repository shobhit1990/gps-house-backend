import { inject, injectable } from "tsyringe";
import { IUserService } from "../../../services/interfaces/IUserService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { MenuSidebarResponse } from "../../../domain/models/MenuSidebarResponse";
import { MenuType } from "../../../domain/enums/MenuType";
import { Response } from "express";
import { LoginUserDto } from "../../../domain/dto/UserAuthDto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppError } from "../../../utils/errors";
import { formatValidationErrors } from "../../../utils/commonFunctions";

const MOBILE_LOGIN_MENU_TYPES: MenuType[] = [
    MenuType.Mobile,
    MenuType.Both,
    MenuType.Web,
];

@injectable()
export class AuthController {
    constructor(
        @inject("IUserService")
        private readonly userService: IUserService,
    ) { }

    loginAuth = asyncHandler(async (req: CustomRequest, res: Response) => {
        const dto = await this.validateDto(LoginUserDto, req.body);
        const { user, token, refreshToken, menus } =
            await this.userService.loginUser(dto, {
                allowedMenuTypes: MOBILE_LOGIN_MENU_TYPES,
            });
        res.status(200).json({
            message: "Login successful",
            data: this.toAuthResponse(user, token, refreshToken, menus),
        });
    });

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

    private toAuthResponse(
        user: Awaited<ReturnType<IUserService["getUserById"]>>,
        token?: string,
        refreshToken?: string,
        menus: MenuSidebarResponse = [],
    ) {
        return {
            externalId: user.externalId,
            userName: user.userName,
            name: user.name ?? user.contactPersonName ?? user.companyName,
            email: user.email ?? null,
            contactNumber: user.phone ?? null,
            userType: user.userType?.roleCode ?? null,
            role: user.userType
                ? {
                    id: user.userType.externalId,
                    roleCode: user.userType.roleCode,
                    name: user.userType.name ?? null,
                }
                : null,
            imeiNumber: user.imeiNumber ?? null,
            companyName: user.companyName,
            contactPersonName: user.contactPersonName ?? null,
            owner: user.owner?.externalId ?? null,
            language: user.language?.externalId ?? null,
            timezone: user.timezone?.externalId ?? null,
            client: user.client?.externalId ?? null,
            group: user.group?.externalId ?? null,
            address: user.address ?? null,
            companyAddress: user.companyAddress ?? null,
            domain: user.domain ?? null,
            vehicleCount: user.vehicleCount ?? null,
            maxVehicleCount: user.maxVehicleCount ?? null,
            allowAllVehicleList: user.allowAllVehicleList ?? null,
            clientImage: user.clientImage ?? null,
            inactiveTime: user.inactiveTime ?? null,
            subscriptionStartDate: user.subscriptionStartDate ?? null,
            subscriptionDueDate: user.subscriptionDueDate ?? null,
            subscriptionExtendDate: user.subscriptionExtendDate ?? null,
            subscriptionExpiryCount: user.subscriptionExpiryCount ?? null,
            maximumRadiusForNearestPOI: user.maximumRadiusForNearestPOI ?? null,
            minimumDistanceForAddress: user.minimumDistanceForAddress ?? null,
            dataRestriction: user.dataRestriction ?? null,
            overwriteSubscription: user.overwriteSubscription ?? null,
            vehicleInactiveAfterExpiry: user.vehicleInactiveAfterExpiry ?? null,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            menus,
            ...(token ? { token } : {}),
            ...(refreshToken ? { refreshToken } : {}),
        };
    }
}