import { MenuItem } from "../../domain/entities/mysql/MenuItem";
import { MenuType } from "../../domain/enums/MenuType";
import { Status } from "../../domain/enums/status";
import { MenuSidebarResponse } from "../../domain/models/MenuSidebarResponse";

export interface MenuItemUpdateRequest {
  priority?: number;
  key?: string;
  label?: string;
  isTitle?: boolean;
  showInMenu?: boolean;
  icon?: string;
  url?: string;
  menuType?: MenuType;
  parentId?: string | null;
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  delete?: boolean;
  filter?: boolean;
  print?: boolean;
  excel?: boolean;
  status?: Status;
}

export interface IMenuItemService {
  getUserMenus(options?: {
    allowedMenuTypes?: MenuType[];
    includeAllMenus?: boolean;
  }): Promise<MenuSidebarResponse>;
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(externalId: string): Promise<MenuItem>;
  getMenuItemsPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: "asc" | "desc";
  }): Promise<{ data: MenuItem[]; total: number; page: number; limit: number }>;

  updateMenuItem(
    externalId: string,
    payload: MenuItemUpdateRequest,
    actorUserId?: number,
  ): Promise<MenuItem>;
}
