import { TimeZone } from "../../entities/mysql/TimeZone";

export interface ITimeZoneRepository {
    getTimeZone(): Promise<TimeZone[]>;
}