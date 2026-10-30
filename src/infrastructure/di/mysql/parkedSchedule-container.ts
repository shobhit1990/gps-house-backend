import { container } from "tsyringe";
import { IParkedScheduleRepository } from "../../../domain/repositories/mysql/IParkedScheduleRepository";
import { ParkedScheduleRepository } from "../../persistence/repositories/mysql/ParkedScheduleRepository";
import { IParkedScheduleService } from "../../../services/interfaces/IParkedScheduleService";
import { ParkedScheduleService } from "../../../services/ParkedScheduleService";

export function registerParkedScheduleDependencies() {
  container.register<IParkedScheduleRepository>(
    "IParkedScheduleRepository",
    ParkedScheduleRepository,
  );
  container.register<IParkedScheduleService>(
    "IParkedScheduleService",
    ParkedScheduleService,
  );
}
