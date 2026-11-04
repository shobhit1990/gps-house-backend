import { Migration } from "@mikro-orm/migrations";

interface ColumnRow {
  COLUMN_NAME: string;
}

interface ForeignKeyRow {
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
}

const userColumns: Array<[string, string]> = [
  ["name", "VARCHAR(255) NULL"],
  ["address", "VARCHAR(255) NULL"],
  ["owner_id", "INT NULL"],
  ["language_id", "INT NULL"],
  ["client_id", "INT NULL"],
  ["domain", "VARCHAR(255) NULL"],
  ["vehicle_count", "VARCHAR(255) NULL"],
  ["max_vehicle_count", "INT UNSIGNED NULL"],
  ["allow_all_vehicle_list", "TINYINT(1) NULL"],
  ["client_image", "JSON NULL"],
  ["inactive_time", "TINYINT NULL"],
  ["subscription_start_date", "DATE NULL"],
  ["subscription_due_date", "DATE NULL"],
  ["subscription_extend_date", "DATE NULL"],
  ["subscription_expiry_count", "VARCHAR(255) NULL"],
  ["maximum_radius_for_nearest_poi", "VARCHAR(255) NULL"],
  ["minimum_distance_for_address", "VARCHAR(255) NULL"],
  ["data_restriction", "VARCHAR(255) NULL"],
  ["overwrite_subscription", "TINYINT(1) NULL"],
  ["vehicle_inactive_after_expiry", "TINYINT(1) NULL"],
  ["session_version", "INT NOT NULL DEFAULT 0"],
];

const userForeignKeys: Array<[string, string, string]> = [
  ["owner_id", "owner_master", "users_owner_id_fk"],
  ["language_id", "language", "users_language_id_fk"],
  ["client_id", "users", "users_client_id_fk"],
];

export class Migration20261104000000 extends Migration {
  override async up(): Promise<void> {
    const existingColumns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    )) as ColumnRow[];
    const existingColumnNames = new Set(
      existingColumns.map((column) => column.COLUMN_NAME),
    );
    const missingColumns = userColumns.filter(
      ([name]) => !existingColumnNames.has(name),
    );

    if (missingColumns.length > 0) {
      const definitions = missingColumns
        .map(([name, definition]) => `ADD COLUMN \`${name}\` ${definition}`)
        .join(",\n");
      await this.execute(`ALTER TABLE users ${definitions}`);
    }

    const existingForeignKeys = (await this.execute(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
    )) as ForeignKeyRow[];

    for (const [column, referencedTable, constraintName] of userForeignKeys) {
      const hasForeignKey = existingForeignKeys.some(
        (foreignKey) =>
          foreignKey.COLUMN_NAME === column &&
          foreignKey.REFERENCED_TABLE_NAME === referencedTable,
      );
      if (!hasForeignKey) {
        await this.execute(
          `ALTER TABLE users
           ADD CONSTRAINT \`${constraintName}\`
           FOREIGN KEY (\`${column}\`) REFERENCES \`${referencedTable}\` (\`id\`)
           ON UPDATE CASCADE ON DELETE SET NULL`,
        );
      }
    }
  }

  override down(): void {
    // Keep profile columns and data intact when rolling back this migration.
  }
}
