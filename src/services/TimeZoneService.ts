import { inject, injectable } from "tsyringe";
import { ITimeZoneService } from "./interfaces/ITimeZoneService";
import { ITimeZoneRepository } from "../domain/repositories/mysql/ITimeZoneRepository";

@injectable()
export class TimeZoneService implements ITimeZoneService{
    constructor(
        @inject("ILanguageRepository")
        private readonly timeZoneRepository: ITimeZoneRepository
    ){}

     async getTimeZone() {

        const timeZone = await this.timeZoneRepository.getTimeZone();

        return timeZone.map((timeZone)=>({
            id: timeZone.externalId,
            timeZone: timeZone.timeZone,
        }))
    }
}