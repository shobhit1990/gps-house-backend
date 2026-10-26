import { inject, injectable } from "tsyringe";
import { IOwnerService } from "../../../services/interfaces/IOwnerService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { Request, Response } from "express";
import { ILanguageService } from "../../../services/interfaces/ILanguageService";
import { AppError } from "../../../utils/errors";
import { ITimeZoneService } from "../../../services/interfaces/ITimeZoneService";

@injectable()
export class MasterController {

  constructor(

    @inject("IOwnerService")
    private readonly ownerService: IOwnerService,

    @inject("ILanguageService")
    private readonly languageService: ILanguageService,

    @inject("ITimeZoneService")
    private readonly timeZoneService: ITimeZoneService,

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
}