import { container } from "tsyringe";
import { IRoleMenuPermissionRepository } from "../../../domain/repositories/mysql/IRoleMenuPermissionRepository";
import { IUserMenuPermissionRepository } from "../../../domain/repositories/mysql/IUserMenuPermissionRepository";
import { IRoleMenuPermissionService } from "../../../services/interfaces/IRoleMenuPermissionService";
import { IUserMenuPermissionService } from "../../../services/interfaces/IUserMenuPermissionService";
import { RoleMenuPermissionService } from "../../../services/RoleMenuPermissionService";
import { UserMenuPermissionService } from "../../../services/UserMenuPermissionService";
import { RoleMenuPermissionRepository } from "../../persistence/repositories/mysql/RoleMenuPermissionRepository";
import { UserMenuPermissionRepository } from "../../persistence/repositories/mysql/UserMenuPermissionRepository";

export function registerPermissionDependencies() {
  container.register<IUserMenuPermissionRepository>(
    "IUserMenuPermissionRepository",
    {
      useClass: UserMenuPermissionRepository,
    },
  );
  container.register<IUserMenuPermissionService>("IUserMenuPermissionService", {
    useClass: UserMenuPermissionService,
  });

  container.register<IRoleMenuPermissionRepository>(
    "IRoleMenuPermissionRepository",
    {
      useClass: RoleMenuPermissionRepository,
    },
  );
  container.register<IRoleMenuPermissionService>("IRoleMenuPermissionService", {
    useClass: RoleMenuPermissionService,
  });
}
