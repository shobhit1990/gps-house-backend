import { Migration } from "@mikro-orm/migrations";

interface ColumnRow {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

interface PreflightRow {
  unmatchedCount: number;
  ambiguousCount: number;
}

interface CountRow {
  count: number;
}

interface ForeignKeyRow {
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
}

export class Migration20261104120000 extends Migration {
  override async up(): Promise<void> {
    const columns = await this.getAddVehicleColumns();
    const deviceColumn = columns.get("device");
    const stagingColumn = columns.get("device_id");
    const legacyColumn = columns.get("legacy_device");

    if (!deviceColumn) {
      throw new Error("Cannot migrate add_vehicle: device column not found");
    }

    if (deviceColumn.DATA_TYPE !== "int") {
      if (legacyColumn) {
        throw new Error(
          "Cannot safely migrate add_vehicle: legacy_device already exists",
        );
      }
      if (stagingColumn && stagingColumn.DATA_TYPE !== "int") {
        throw new Error(
          "Cannot safely migrate add_vehicle: device_id is not an integer column",
        );
      }

      const [preflight] = (await this.execute(
        `SELECT
           COALESCE(SUM(device_external.id IS NULL
                        AND device_imei.id IS NULL), 0) AS unmatchedCount,
           COALESCE(SUM(device_external.id IS NOT NULL
                        AND device_imei.id IS NOT NULL
                        AND device_external.id <> device_imei.id), 0) AS ambiguousCount
         FROM add_vehicle AS vehicle
         LEFT JOIN device AS device_external
           ON device_external.external_id = vehicle.device
         LEFT JOIN device AS device_imei
           ON device_imei.imei = vehicle.device`,
      )) as PreflightRow[];

      if (Number(preflight.ambiguousCount) > 0) {
        throw new Error(
          `Cannot safely migrate add_vehicle.device: ${preflight.ambiguousCount} values match multiple Devices`,
        );
      }

      if (!stagingColumn) {
        await this.execute(
          "ALTER TABLE add_vehicle ADD COLUMN device_id INT NULL",
        );
      }

      await this.execute(
        `UPDATE add_vehicle AS vehicle
         LEFT JOIN device AS device_external
           ON device_external.external_id = vehicle.device
         LEFT JOIN device AS device_imei
           ON device_imei.imei = vehicle.device
         SET vehicle.device_id = COALESCE(device_external.id, device_imei.id)
         WHERE vehicle.device_id IS NULL
           AND (device_external.id IS NOT NULL OR device_imei.id IS NOT NULL)`,
      );

      await this.execute(
        `ALTER TABLE add_vehicle
         CHANGE COLUMN device legacy_device VARCHAR(255) NULL,
         CHANGE COLUMN device_id device INT NULL`,
      );
    } else if (!legacyColumn) {
      throw new Error(
        "Cannot safely migrate add_vehicle: legacy device values were not preserved",
      );
    }

    const foreignKeys = (await this.execute(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'add_vehicle'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
    )) as ForeignKeyRow[];
    const hasDeviceForeignKey = foreignKeys.some(
      ({ COLUMN_NAME, REFERENCED_TABLE_NAME }) =>
        COLUMN_NAME === "device" && REFERENCED_TABLE_NAME === "device",
    );
    if (!hasDeviceForeignKey) {
      await this.execute(
        `ALTER TABLE add_vehicle
         ADD CONSTRAINT add_vehicle_device_fk
         FOREIGN KEY (device) REFERENCES device (id)
         ON UPDATE CASCADE ON DELETE RESTRICT`,
      );
    }
  }

  override async down(): Promise<void> {
    const columns = await this.getAddVehicleColumns();
    const deviceColumn = columns.get("device");
    const legacyColumn = columns.get("legacy_device");
    if (!deviceColumn || deviceColumn.DATA_TYPE !== "int" || !legacyColumn) {
      return;
    }

    const foreignKeys = (await this.execute(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'add_vehicle'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
    )) as ForeignKeyRow[];
    const deviceForeignKey = foreignKeys.find(
      ({ COLUMN_NAME, REFERENCED_TABLE_NAME }) =>
        COLUMN_NAME === "device" && REFERENCED_TABLE_NAME === "device",
    );
    if (deviceForeignKey) {
      await this.execute(
        `ALTER TABLE add_vehicle DROP FOREIGN KEY \`${deviceForeignKey.CONSTRAINT_NAME}\``,
      );
    }

    await this.execute(
      `UPDATE add_vehicle AS vehicle
       INNER JOIN device ON device.id = vehicle.device
       SET vehicle.legacy_device = device.external_id
       WHERE vehicle.legacy_device IS NULL`,
    );

    const [{ count }] = (await this.execute(
      "SELECT COUNT(*) AS count FROM add_vehicle WHERE legacy_device IS NULL",
    )) as CountRow[];
    if (Number(count) > 0) {
      throw new Error(
        `Cannot safely roll back add_vehicle device relation: ${count} rows have no device value to restore`,
      );
    }

    await this.execute(
      `ALTER TABLE add_vehicle
       DROP COLUMN device,
       CHANGE COLUMN legacy_device device VARCHAR(255) NOT NULL`,
    );
  }

  private async getAddVehicleColumns(): Promise<Map<string, ColumnRow>> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'add_vehicle'`,
    )) as ColumnRow[];
    return new Map(columns.map((column) => [column.COLUMN_NAME, column]));
  }
}
