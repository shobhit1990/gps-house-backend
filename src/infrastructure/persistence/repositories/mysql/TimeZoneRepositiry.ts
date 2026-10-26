import { injectable } from "tsyringe";
import { ITimeZoneRepository } from "../../../../domain/repositories/mysql/ITimeZoneRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { TimeZone } from "../../../../domain/entities/mysql/TimeZone";

@injectable()
export class TimeZoneRepository implements ITimeZoneRepository {
    constructor(private readonly em: EntityManager) {}

    async getTimeZone(): Promise<TimeZone[]> {
    const emFork = this.em.fork();

    return await emFork.find(TimeZone, {
        isDeleted: false,
    });
}
}