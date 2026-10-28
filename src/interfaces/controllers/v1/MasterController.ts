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

  ) { }

  getMasterOwnerList = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ownerList = await this.ownerService.getOwner();
    res.status(200).json({
      data: ownerList,
      message: "Master Owner list fetch successfully"
    })

  })

  getMasterLanguageList = asyncHandler(
    async (req: Request, res: Response) => {
      const languageList = await this.languageService.getLanguage();

      res.status(200).json({
        data: languageList,
        message: "Language list fetched successfully",
      });
    }
  );

  getMasterTimeZoneList = asyncHandler(
    async (req: Request, res: Response) => {
      const timeZoneList = await this.timeZoneService.getTimeZone();

      res.status(200).json({
        data: timeZoneList,
        message: "TimeZone list fetched successfully",
      });
    }
  );

  getMasterVehicleList = asyncHandler(
    async (req: Request, res: Response) => {
      const vehicleList = await this.vehicleService.getAddVehicle();

      res.status(200).json({
        data: vehicleList,
        message: "Vehicle list fetched successfully",
      });
    }
  );

   getMasterClientList = asyncHandler(
    async (req: Request, res: Response) => {
      const clientList = await this.clientService.getClient();

      res.status(200).json({
        data: clientList,
        message: "Client list fetched successfully",
      });
    }
  );

   getMasterTechnicianList = asyncHandler(
    async (req: Request, res: Response) => {
      const technicianList = await this.technicianService.getTechnicians();

      res.status(200).json({
        data: technicianList,
        message: "Technician list fetched successfully",
      });
    }
  );

  getMasterTransporterList = asyncHandler(
    async (req: Request, res: Response) => {
      const transporterList = await this.transporterService.getTransporter();

      res.status(200).json({
        data: transporterList,
        message: "Transporter list fetched successfully",
      });
    }
  );

}