import { container } from "tsyringe";
import { ITimeZoneRepository } from "../../../domain/repositories/mysql/ITimeZoneRepository";
import { TimeZoneRepository } from "../../persistence/repositories/mysql/TimeZoneRepositiry";
import { ITimeZoneService } from "../../../services/interfaces/ITimeZoneService";
import { TimeZoneService } from "../../../services/TimeZoneService";

export function registerTimeZoneDependencies() {
  container.register<ITimeZoneRepository>("ITimeZoneRepository", {
    useClass: TimeZoneRepository,
  });

  container.register<ITimeZoneService>("ITimeZoneService", {
    useClass: TimeZoneService,
  });
}