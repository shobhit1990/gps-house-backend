import { container } from "tsyringe";
import { IAddGroupRepository } from "../../../domain/repositories/mysql/IAddGroupRepository";
import { AddGroupRepository } from "../../persistence/repositories/mysql/AddGroupRepository";
import { IAddGroupService } from "../../../services/interfaces/IAddGroupService";
import { AddGroupService } from "../../../services/AddGroupService";

export function registerAddGroupDependencies() {
  container.register<IAddGroupRepository>(
    "IAddGroupRepository",
    AddGroupRepository,
  );
  container.register<IAddGroupService>("IAddGroupService", AddGroupService);
}
