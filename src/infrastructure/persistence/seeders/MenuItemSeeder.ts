import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import { logger } from "../../../configs/logger";
import { MenuItem } from "../../../domain/entities/mysql/MenuItem";
import { MenuName } from "../../../domain/enums/MenuName";
import { MenuType } from "../../../domain/enums/MenuType";
import { Status } from "../../../domain/enums/status";

type MenuSeed = {
  key: MenuName;
  label: string;
  priority: number;
  icon?: string;
  url?: string;
  isTitle?: boolean;
  parentKey?: MenuName;
};

/**
 * Sidebar tree seed. Keys are unique (`menu_items.key`).
 * Re-runs upsert by key and re-link parents — they do not insert duplicates.
 */
export const MENU_SEEDS: MenuSeed[] = [
  {
    key: MenuName.Home,
    label: "Home",
    priority: 1,
    icon: "home",
    url: "/home",
  },
  {
    key: MenuName.Manage,
    label: "Manage",
    priority: 2,
    icon: "manage",
    url: "/manage",
  },
  {
    key: MenuName.Vehicles,
    label: "Vehicles",
    priority: 1,
    icon: "pin",
    url: "/vehicles",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.Devices,
    label: "Devices",
    priority: 2,
    icon: "pin",
    url: "/devices",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.Transporter,
    label: "Transporter",
    priority: 3,
    icon: "pin",
    url: "/transporter",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.ManageTechnician,
    label: "Manage Technician",
    priority: 4,
    icon: "pin",
    url: "/technician",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.Client,
    label: "Client",
    priority: 5,
    icon: "pin",
    url: "/client",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.UserGroups,
    label: "User Groups",
    priority: 6,
    icon: "pin",
    url: "/user-groups",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.VehicleDetail,
    label: "Vehicle Detail",
    priority: 7,
    icon: "pin",
    url: "/vehicle-detail",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.DriverDetail,
    label: "Driver Detail",
    priority: 8,
    icon: "pin",
    url: "/driver-detail",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.Geofence,
    label: "Geofence",
    priority: 9,
    icon: "pin",
    url: "/geofence",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.PaymentDetail,
    label: "Payment Detail",
    priority: 10,
    icon: "pin",
    url: "/payment-detail",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.DeviceInventory,
    label: "Device Inventory",
    priority: 11,
    icon: "pin",
    url: "/device-inventory",
    parentKey: MenuName.Manage,
  },
  {
    key: MenuName.Reports,
    label: "Reports",
    priority: 3,
    icon: "reports",
    url: "/reports",
  },
  {
    key: MenuName.Alerts,
    label: "Alerts",
    priority: 4,
    icon: "alerts",
    url: "/alerts",
  },
  {
    key: MenuName.Settings,
    label: "Settings",
    priority: 5,
    icon: "settings",
    url: "/settings",
  },
  {
    key: MenuName.Support,
    label: "Support",
    priority: 6,
    icon: "support",
    url: "/support",
  },
  {
    key: MenuName.AccessManagement,
    label: "Access Management",
    priority: 7,
    icon: "access",
    url: "/access-management",
  },
  {
    key: MenuName.Owner,
    label: "Owner",
    priority: 1,
    icon: "users",
    url: "/owner",
    parentKey: MenuName.AccessManagement,
  },
  {
    key: MenuName.Role,
    label: "Role",
    priority: 2,
    icon: "pin",
    url: "/role",
    parentKey: MenuName.AccessManagement,
  },
  {
    key: MenuName.User,
    label: "User",
    priority: 3,
    icon: "pin",
    url: "/user",
    parentKey: MenuName.AccessManagement,
  },
];

export function validateMenuSeeds(seeds: MenuSeed[]): void {
  const seen = new Set<string>();
  for (const seed of seeds) {
    if (seen.has(seed.key)) {
      throw new Error(
        `MenuItemSeeder: duplicate menu key "${seed.key}" in MENU_SEEDS`,
      );
    }
    seen.add(seed.key);
  }

  const keys = new Set(seeds.map((seed) => seed.key));
  for (const seed of seeds) {
    if (seed.parentKey && !keys.has(seed.parentKey)) {
      throw new Error(
        `MenuItemSeeder: parent menu "${seed.parentKey}" for "${seed.key}" is missing from MENU_SEEDS`,
      );
    }
  }
}

function applyFullAccessFlags(
  target: Pick<
    MenuItem,
    "view" | "add" | "edit" | "delete" | "filter" | "print" | "excel"
  >,
): void {
  // MenuItem flags = menu capability defaults for the catalog.
  target.view = true;
  target.add = true;
  target.edit = true;
  target.delete = true;
  target.filter = true;
  target.print = true;
  target.excel = true;
}

function clearSoftDelete(entity: {
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: unknown;
}): void {
  entity.isDeleted = false;
  entity.deletedAt = null;
  entity.deletedBy = undefined;
}

export class MenuItemSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      validateMenuSeeds(MENU_SEEDS);

      const menusByKey = await this.upsertMenus(em);
      await this.linkParents(em, menusByKey);

      logger.info(
        `MenuItemSeeder finished. Upserted ${menusByKey.size} menu item(s).`,
      );
    } catch (error) {
      logger.error("MenuItemSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async upsertMenus(
    em: EntityManager,
  ): Promise<Map<MenuName, MenuItem>> {
    const menusByKey = new Map<MenuName, MenuItem>();

    for (const seed of MENU_SEEDS) {
      // key is unique — includes soft-deleted rows so re-seed reactivates instead of duplicating.
      let menu = await em.findOne(MenuItem, { key: seed.key });
      const isNew = !menu;
      if (!menu) {
        menu = new MenuItem();
        menu.key = seed.key;
      }

      menu.label = seed.label;
      menu.priority = seed.priority;
      menu.icon = seed.icon;
      menu.url = seed.url;
      menu.isTitle = seed.isTitle ?? false;
      menu.showInMenu = true;
      menu.menuType = MenuType.Both;
      menu.status = Status.ACTIVE;
      applyFullAccessFlags(menu);
      clearSoftDelete(menu);

      em.persist(menu);
      menusByKey.set(seed.key, menu);
      logger.info(
        isNew
          ? `Menu "${seed.key}" created.`
          : `Menu "${seed.key}" already exists. Updated.`,
      );
    }

    await em.flush();
    return menusByKey;
  }

  private async linkParents(
    em: EntityManager,
    menusByKey: Map<MenuName, MenuItem>,
  ): Promise<void> {
    for (const seed of MENU_SEEDS) {
      const menu = menusByKey.get(seed.key);
      if (!menu) {
        throw new Error(
          `MenuItemSeeder: menu "${seed.key}" was not loaded after upsert`,
        );
      }

      if (!seed.parentKey) {
        menu.parent = undefined;
        continue;
      }

      const parent = menusByKey.get(seed.parentKey);
      if (!parent) {
        throw new Error(
          `MenuItemSeeder: parent menu "${seed.parentKey}" for "${seed.key}" was not seeded`,
        );
      }
      menu.parent = parent;
    }

    await em.flush();
  }
}
