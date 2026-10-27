import { MenuType } from "../enums/MenuType";

export interface MenuSidebarPermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  filter: boolean;
  print: boolean;
  excel: boolean;
}

export interface MenuSidebarParentInfo {
  id: string;
  key: string;
  label: string;
  icon?: string;
}

export interface MenuSidebarItem {
  id: string;
  key: string;
  label: string;
  icon?: string;
  url?: string;
  isTitle: boolean;
  priority: number;
  menuType: MenuType;
  parent: MenuSidebarParentInfo | null;
  permissions: MenuSidebarPermissions;
  children: MenuSidebarItem[];
}

export type MenuSidebarResponse = MenuSidebarItem[];
