import { inject, injectable } from "tsyringe";
import { IOwnerService } from "../../../services/interfaces/IOwnerService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { Request, Response } from "express";
import { ILanguageService } from "../../../services/interfaces/ILanguageService";
import { AppError } from "../../../utils/errors";
import { ITimeZoneService } from "../../../services/interfaces/ITimeZoneService";
import { IAddVehicleService } from "../../../services/interfaces/IAddVehicleService";
import { IClientService } from "../../../services/interfaces/IClientService";
import { ITechnicianService } from "../../../services/interfaces/ITechnicianService";
import { ITransporterService } from "../../../services/interfaces/ITransporterService";
import { IDeviceTypeService } from "../../../services/interfaces/IDeviceTypeService";
import { IExpenseTypeService } from "../../../services/interfaces/IExpenseTypeService";
import { IRoleService } from "../../../services/interfaces/IRoleService";
import { IUserService } from "../../../services/interfaces/IUserService";
import { IAddGroupService } from "../../../services/interfaces/IAddGroupService";
import { IAlertService } from "../../../services/interfaces/IAlertService";
import { IMasterLocationService } from "../../../services/interfaces/IMasterLocationService";
import { IDeviceService } from "../../../services/interfaces/IDeviceService";
import { IGeofTypeService } from "../../../services/interfaces/IGeofTypeService";
import { IGeofenceService } from "../../../services/interfaces/IGeofenceService";
import { ILicenseService } from "../../../services/interfaces/ILicenseService";
import { IdleSummaryStatus } from "../../../domain/enums/IdleSummaryStatus";
import { Minutes } from "../../../domain/enums/Minutes";
import { AlertOperation } from "../../../domain/enums/AlertOperation";
import { AddAlertType } from "../../../domain/enums/AddAlertType";
import { GeofenceRestrictionType } from "../../../domain/enums/GeofenceRestrictionType";
import { TripRestrictionType } from "../../../domain/enums/TripRestrictionType";
import { Status } from "../../../domain/enums/status";

@injectable()
export class MasterController {
  constructor(
    @inject("IOwnerService")
    private readonly ownerService: IOwnerService,

    @inject("ILanguageService")
    private readonly languageService: ILanguageService,

    @inject("ITimeZoneService")
    private readonly timeZoneService: ITimeZoneService,

    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,

    @inject("IClientService")
    private readonly clientService: IClientService,

    @inject("ITechnicianService")
    private readonly technicianService: ITechnicianService,

    @inject("ITransporterService")
    private readonly transporterService: ITransporterService,

    @inject("IDeviceTypeService")
    private readonly deviceTypeService: IDeviceTypeService,

    @inject("IExpenseTypeService")
    private readonly expenseTypeService: IExpenseTypeService,

    @inject("IRoleService")
    private readonly roleService: IRoleService,

    @inject("IUserService")
    private readonly userService: IUserService,

    @inject("IAddGroupService")
    private readonly addGroupService: IAddGroupService,

    @inject("IAlertService")
    private readonly alertService: IAlertService,

    @inject("IDeviceService")
    private readonly deviceService: IDeviceService,

    @inject("IMasterLocationService")
    private readonly masterLocationService: IMasterLocationService,

    @inject("IGeofTypeService")
    private readonly geofTypeService: IGeofTypeService,

    @inject("IGeofenceService")
    private readonly geofenceService: IGeofenceService,

    @inject("ILicenseService")
    private readonly licenseService: ILicenseService,
  ) {}

  getMasterOwnerList = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const ownerList = await this.ownerService.getOwner();
      res.status(200).json({
        data: this.onlyActive(ownerList),
        message: "Master Owner list fetch successfully",
      });
    },
  );

  getMasterLanguageList = asyncHandler(async (req: Request, res: Response) => {
    const languageList = await this.languageService.getLanguage();

    res.status(200).json({
      data: languageList,
      message: "Language list fetched successfully",
    });
  });

  getMasterStateList = asyncHandler(async (_req: Request, res: Response) => {
    const stateList = await this.masterLocationService.getStates();
    res.status(200).json({
      data: this.onlyActive(stateList),
      message: "State list fetched successfully",
    });
  });

  getMasterDistrictList = asyncHandler(async (req: Request, res: Response) => {
    const queryStateId = req.query.stateId;
    if (Array.isArray(queryStateId)) {
      throw new AppError("stateId must be a single state ID", 400);
    }

    const stateId =
      typeof queryStateId === "string" ? queryStateId.trim() : undefined;
    const districtList = await this.masterLocationService.getDistricts(
      stateId || undefined,
    );
    res.status(200).json({
      data: this.onlyActive(districtList),
      message: "District list fetched successfully",
    });
  });

  getMasterTimeZoneList = asyncHandler(async (req: Request, res: Response) => {
    const timeZoneList = await this.timeZoneService.getTimeZone();

    res.status(200).json({
      data: timeZoneList,
      message: "TimeZone list fetched successfully",
    });
  });

  getMasterVehicleList = asyncHandler(async (req: Request, res: Response) => {
    const vehicleList = await this.vehicleService.getAddVehicle({
      clientExternalId: this.parseOptionalQueryString(
        req.query.client,
        "client",
      ),
      transporterExternalId: this.parseOptionalQueryString(
        req.query.transporter,
        "transporter",
      ),
    });

    res.status(200).json({
      data: this.onlyActive(vehicleList),
      message: "Vehicle list fetched successfully",
    });
  });

  getMasterClientList = asyncHandler(async (req: Request, res: Response) => {
    const clientList = await this.clientService.getClient();

    res.status(200).json({
      data: this.onlyActive(clientList),
      message: "Client list fetched successfully",
    });
  });

  getMasterTechnicianList = asyncHandler(
    async (req: Request, res: Response) => {
      const technicianList = await this.technicianService.getTechnicians();

      res.status(200).json({
        data: this.onlyActive(technicianList),
        message: "Technician list fetched successfully",
      });
    },
  );

  getMasterTransporterList = asyncHandler(
    async (req: Request, res: Response) => {
      const clientExternalId = this.parseOptionalQueryString(
        req.query.client,
        "client",
      );
      const transporterList =
        await this.transporterService.getTransporter(clientExternalId);

      res.status(200).json({
        data: this.onlyActive(transporterList),
        message: "Transporter list fetched successfully",
      });
    },
  );

  getMasterDeviceTypeList = asyncHandler(
    async (req: Request, res: Response) => {
      const deviceTypeList = await this.deviceTypeService.getDeviceTypes();

      res.status(200).json({
        data: this.onlyActive(deviceTypeList),
        message: "DeviceType list fetched successfully",
      });
    },
  );

  getMasterDeviceList = asyncHandler(async (req: Request, res: Response) => {
    const deviceList = await this.deviceService.getDevices();

    res.status(200).json({
      data: this.onlyActive(deviceList),
      message: "Device list fetched successfully",
    });
  });

  getMasterExpenseTypeList = asyncHandler(
    async (req: Request, res: Response) => {
      const expenseTypeList = await this.expenseTypeService.getExpenseTypes();

      res.status(200).json({
        data: this.onlyActive(expenseTypeList),
        message: "ExpenseType list fetched successfully",
      });
    },
  );

  getMasterRoleList = asyncHandler(async (req: Request, res: Response) => {
    const roleList = await this.roleService.getRole();

    res.status(200).json({
      data: this.onlyActive(roleList),
      message: "Role list fetched successfully",
    });
  });

  getMasterUserList = asyncHandler(async (req: Request, res: Response) => {
    const userList = await this.userService.getUsers();

    res.status(200).json({
      data: this.onlyActive(
        userList.map(
          ({ password, ...userWithoutPassword }) => userWithoutPassword,
        ),
      ),
      message: "User list fetched successfully",
    });
  });

  getMasterGroupList = asyncHandler(async (req: Request, res: Response) => {
    const groupList = await this.addGroupService.getAddGroups();

    res.status(200).json({
      data: this.onlyActive(groupList),
      message: "Group list fetched successfully",
    });
  });

  getMasterAlertList = asyncHandler(async (req: Request, res: Response) => {
    const alertList = await this.alertService.getAlert();

    res.status(200).json({
      data: alertList,
      message: "Alert list fetched successfully",
    });
  });

  getMasterGeofTypeList = asyncHandler(async (req: Request, res: Response) => {
    const typeList = await this.geofTypeService.getGeofType();

    res.status(200).json({
      data: this.onlyActive(typeList),
      message: "GeofType list fetched successfully",
    });
  });

  getMasterGeofenceList = asyncHandler(async (req: Request, res: Response) => {
    const List = await this.geofenceService.getGeofences();

    res.status(200).json({
      data: this.onlyActive(List),
      message: "Geofence list fetched successfully",
    });
  });

  getMasterLicenseList = asyncHandler(async (_req: Request, res: Response) => {
    const licenseList = await this.licenseService.getLicenses();
    res.status(200).json({
      data: this.onlyActive(licenseList),
      message: "License list fetched successfully",
    });
  });

  getMasterDurationList = asyncHandler(async (_req: Request, res: Response) => {
    const durationList = Object.values(Minutes).map((value) => ({
      id: value,
      label: `${value} min`,
      value,
    }));
    res.status(200).json({
      data: durationList,
      message: "Duration list fetched successfully",
    });
  });

  getMasterIdleSummaryStatusList = asyncHandler(
    async (_req: Request, res: Response) => {
      const statusList = Object.values(IdleSummaryStatus).map((value) => ({
        id: value,
        label: value,
        value,
      }));
      res.status(200).json({
        data: statusList,
        message: "Idle summary status list fetched successfully",
      });
    },
  );

  getMasterAlertOperationList = asyncHandler(
    async (_req: Request, res: Response) => {
      const operationList = Object.values(AlertOperation).map((value) => ({
        id: value,
        label: value,
        value,
      }));
      res.status(200).json({
        data: operationList,
        message: "Alert operation list fetched successfully",
      });
    },
  );

  getMasterAddAlertTypeList = asyncHandler(
    async (_req: Request, res: Response) => {
      const typeList = Object.values(AddAlertType).map((value) => ({
        id: value,
        label: value,
        value,
      }));
      res.status(200).json({
        data: typeList,
        message: "Add alert type list fetched successfully",
      });
    },
  );

  getMasterGeofenceRestrictionTypeList = asyncHandler(
    async (_req: Request, res: Response) => {
      const typeList = Object.values(GeofenceRestrictionType).map((value) => ({
        id: value,
        label: value,
        value,
      }));
      res.status(200).json({
        data: typeList,
        message: "Geofence restriction type list fetched successfully",
      });
    },
  );

  getMasterTripRestrictionTypeList = asyncHandler(
    async (_req: Request, res: Response) => {
      const typeList = Object.values(TripRestrictionType).map((value) => ({
        id: value,
        label: value,
        value,
      }));
      res.status(200).json({
        data: typeList,
        message: "Trip restriction type list fetched successfully",
      });
    },
  );

  private onlyActive<T extends { status?: Status | string | null }>(
    items: T[],
  ): T[] {
    return items.filter((item) => item.status === Status.ACTIVE);
  }

  private parseOptionalQueryString(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== "string" || !raw.trim()) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
    return raw.trim();
  }
}
