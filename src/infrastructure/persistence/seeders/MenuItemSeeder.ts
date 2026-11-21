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
 *
 * Top-level: Home, Master, Vehicles, Reports, Alerts, Settings, Support, Access Management
 */
export const MENU_SEEDS: MenuSeed[] = [
  // ── Top-level parents ──────────────────────────────────────────────
  {
    key: MenuName.Home,
    label: "Home",
    priority: 1,
    icon: "home",
    url: "/home",
  },
  {
    key: MenuName.Master,
    label: "Master",
    priority: 2,
    icon: "master",
    url: "/master",
  },
  {
    key: MenuName.Vehicle,
    label: "Vehicles",
    priority: 3,
    icon: "vehicles",
    url: "/vehicles",
  },
  {
    key: MenuName.Reports,
    label: "Reports",
    priority: 4,
    icon: "reports",
    url: "/reports",
  },
  {
    key: MenuName.Alerts,
    label: "Alerts",
    priority: 5,
    icon: "alerts",
    url: "/alerts",
  },
  {
    key: MenuName.Settings,
    label: "Settings",
    priority: 6,
    icon: "settings",
    url: "/settings",
  },
  {
    key: MenuName.Support,
    label: "Support",
    priority: 7,
    icon: "support",
    url: "/support",
  },
  {
    key: MenuName.AccessManagement,
    label: "Access Management",
    priority: 8,
    icon: "access",
    url: "/access-management",
  },

  // ── Home children ──────────────────────────────────────────────────
  {
    key: MenuName.Dashboard,
    label: "Dashboard",
    priority: 1,
    icon: "pin",
    url: "/dashboard",
    parentKey: MenuName.Home,
  },
  {
    key: MenuName.AdvancedDashboard,
    label: "Advance Dashboard",
    priority: 2,
    icon: "pin",
    url: "/advanced-dashboard",
    parentKey: MenuName.Home,
  },
  {
    key: MenuName.AnalyticsDashboard,
    label: "Analytics Dashboard",
    priority: 3,
    icon: "pin",
    url: "/analytics-dashboard",
    parentKey: MenuName.Home,
  },

  // ── Master children ────────────────────────────────────────────────
  {
    key: MenuName.Owner,
    label: "Owners",
    priority: 1,
    icon: "pin",
    url: "/owner",
    parentKey: MenuName.Master,
  },
  {
    key: MenuName.Role,
    label: "Roles",
    priority: 2,
    icon: "pin",
    url: "/role",
    parentKey: MenuName.Master,
  },
  {
    key: MenuName.DeviceType,
    label: "Device Type",
    priority: 3,
    icon: "pin",
    url: "/device-type",
    parentKey: MenuName.Master,
  },
  {
    key: MenuName.GeoType,
    label: "Geo Type",
    priority: 4,
    icon: "pin",
    url: "/geo-type",
    parentKey: MenuName.Master,
  },
  {
    key: MenuName.DriverLicence,
    label: "Driver Licence",
    priority: 5,
    icon: "pin",
    url: "/driver-licence",
    parentKey: MenuName.Master,
  },
  {
    key: MenuName.ExpenseType,
    label: "Expense Type",
    priority: 6,
    icon: "pin",
    url: "/expense-type",
    parentKey: MenuName.Master,
  },

  // ── Vehicles (Vehicle parent) children ─────────────────────────────
  {
    key: MenuName.Vehicles,
    label: "Vehicles",
    priority: 1,
    icon: "pin",
    url: "/vehicle",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.Devices,
    label: "Devices",
    priority: 2,
    icon: "pin",
    url: "/devices",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.Transporter,
    label: "Transporter",
    priority: 3,
    icon: "pin",
    url: "/transporter",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.ManageTechnician,
    label: "Manage Technician",
    priority: 4,
    icon: "pin",
    url: "/technician",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.Client,
    label: "Client",
    priority: 5,
    icon: "pin",
    url: "/client",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.UserGroups,
    label: "User Groups",
    priority: 6,
    icon: "pin",
    url: "/user-groups",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.VehicleDetail,
    label: "Vehicle Detail",
    priority: 7,
    icon: "pin",
    url: "/vehicle-detail",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.DriverDetail,
    label: "Driver Detail",
    priority: 8,
    icon: "pin",
    url: "/driver-detail",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.Geofence,
    label: "Geofence",
    priority: 9,
    icon: "pin",
    url: "/geofence",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.PaymentDetail,
    label: "Payment Detail",
    priority: 10,
    icon: "pin",
    url: "/payment-detail",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.Enquiry,
    label: "Enquiry",
    priority: 11,
    icon: "pin",
    url: "/enquiry",
    parentKey: MenuName.Vehicle,
  },
  {
    key: MenuName.DeviceInventory,
    label: "Device Inventory",
    priority: 12,
    icon: "pin",
    url: "/device-inventory",
    parentKey: MenuName.Vehicle,
  },

  // ── ManageTechnician children ──────────────────────────────────────
  {
    key: MenuName.TechnicianList,
    label: "Technician List",
    priority: 1,
    icon: "pin",
    url: "/technician/list",
    parentKey: MenuName.ManageTechnician,
  },
  {
    key: MenuName.JobSheet,
    label: "Job Sheet",
    priority: 2,
    icon: "pin",
    url: "/jobsheet",
    parentKey: MenuName.ManageTechnician,
  },

  // ── UserGroups children ────────────────────────────────────────────
  {
    key: MenuName.User,
    label: "User",
    priority: 1,
    icon: "pin",
    url: "/user",
    parentKey: MenuName.UserGroups,
  },
  {
    key: MenuName.Group,
    label: "Group",
    priority: 2,
    icon: "pin",
    url: "/group",
    parentKey: MenuName.UserGroups,
  },

  // ── Reports children ───────────────────────────────────────────────
  {
    key: MenuName.CoinBanking,
    label: "Coin Banking",
    priority: 1,
    icon: "pin",
    url: "/reports/coin-banking",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.DistanceReport,
    label: "Distance Report",
    priority: 2,
    icon: "pin",
    url: "/reports/distance",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.DriverAssignmentReport,
    label: "Driver Assignment Report",
    priority: 3,
    icon: "pin",
    url: "/reports/driver-assignment",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.ExpenseReport,
    label: "Expense Report",
    priority: 4,
    icon: "pin",
    url: "/reports/expense",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.GeofenceReport,
    label: "Geofence Report",
    priority: 5,
    icon: "pin",
    url: "/reports/geofence",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.GoogleMapApiRecord,
    label: "Google Map API Record",
    priority: 6,
    icon: "pin",
    url: "/reports/google-map-api-record",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.IdleSummaryReport,
    label: "Idle Summary Report",
    priority: 7,
    icon: "pin",
    url: "/reports/idle-summary",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.PoiReport,
    label: "POI Report",
    priority: 8,
    icon: "pin",
    url: "/reports/poi",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.RegisterMobileReport,
    label: "Register Mobile Report",
    priority: 9,
    icon: "pin",
    url: "/reports/register-mobile",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.RideReport,
    label: "Ride Report",
    priority: 10,
    icon: "pin",
    url: "/reports/ride",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SendCommandLogs,
    label: "Send Command Logs",
    priority: 11,
    icon: "pin",
    url: "/reports/send-command-logs",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SensorReport,
    label: "Sensor Report",
    priority: 12,
    icon: "pin",
    url: "/reports/sensor",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SimTrackingReport,
    label: "SIM Tracking Report",
    priority: 13,
    icon: "pin",
    url: "/reports/sim-tracking",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SpeedAndDistance,
    label: "Speed & Distance",
    priority: 14,
    icon: "pin",
    url: "/reports/speed-and-distance",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.StatusReport,
    label: "Status Report",
    priority: 15,
    icon: "pin",
    url: "/reports/status",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.StoppageSummaryReport,
    label: "Stoppage Summary Report",
    priority: 16,
    icon: "pin",
    url: "/reports/stoppage-summary",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SubscriptionChangeReport,
    label: "Subscription Change Report",
    priority: 17,
    icon: "pin",
    url: "/reports/subscription-change",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.SubscriptionExpiredReport,
    label: "Subscription Expired Report",
    priority: 18,
    icon: "pin",
    url: "/reports/subscription-expired",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.TravelSummaryReport,
    label: "Travel Summary Report",
    priority: 19,
    icon: "pin",
    url: "/reports/travel-summary",
    parentKey: MenuName.Reports,
  },
  {
    key: MenuName.VehicleLogReport,
    label: "Vehicle Log Report",
    priority: 20,
    icon: "pin",
    url: "/reports/vehicle-log",
    parentKey: MenuName.Reports,
  },

  // ── Alerts children ────────────────────────────────────────────────
  {
    key: MenuName.AddAlerts,
    label: "Add Alerts",
    priority: 1,
    icon: "pin",
    url: "/alerts/add",
    parentKey: MenuName.Alerts,
  },
  {
    key: MenuName.NotificationList,
    label: "Notification List",
    priority: 2,
    icon: "pin",
    url: "/alerts/notifications",
    parentKey: MenuName.Alerts,
  },
  {
    key: MenuName.ServiceMaintenance,
    label: "Service & Maintenance",
    priority: 3,
    icon: "pin",
    url: "/service-maintenance",
    parentKey: MenuName.Alerts,
  },
  {
    key: MenuName.ParkedScheduler,
    label: "Parked Scheduler",
    priority: 4,
    icon: "pin",
    url: "/parked-scheduler",
    parentKey: MenuName.Alerts,
  },
  {
    key: MenuName.Announcement,
    label: "Announcement",
    priority: 5,
    icon: "pin",
    url: "/announcement",
    parentKey: MenuName.Alerts,
  },

  // ── Support children ───────────────────────────────────────────────
  {
    key: MenuName.RaiseTicket,
    label: "Raise Ticket",
    priority: 1,
    icon: "pin",
    url: "/raise-ticket",
    parentKey: MenuName.Support,
  },
  {
    key: MenuName.AnswerTicket,
    label: "Answer Ticket",
    priority: 2,
    icon: "pin",
    url: "/answer-ticket",
    parentKey: MenuName.Support,
  },
  {
    key: MenuName.Policy,
    label: "Policy",
    priority: 3,
    icon: "pin",
    url: "/policy",
    parentKey: MenuName.Support,
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
      await this.softDeleteObsoleteMenus(em, menusByKey);

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

  /** Soft-delete catalog rows that are no longer in MENU_SEEDS (e.g. old "manage"). */
  private async softDeleteObsoleteMenus(
    em: EntityManager,
    menusByKey: Map<MenuName, MenuItem>,
  ): Promise<void> {
    const activeMenus = await em.find(MenuItem, { isDeleted: false });
    const seedKeys = new Set<string>([...menusByKey.keys()]);
    let removed = 0;

    for (const menu of activeMenus) {
      if (seedKeys.has(menu.key)) {
        continue;
      }
      menu.isDeleted = true;
      menu.deletedAt = new Date();
      menu.status = Status.INACTIVE;
      removed += 1;
      logger.info(`Menu "${menu.key}" soft-deleted (obsolete).`);
    }

    if (removed > 0) {
      await em.flush();
    }
  }
}
