import { Migration } from "@mikro-orm/migrations";

interface ColumnRow {
  COLUMN_NAME: string;
}

/**
 * Add Group: optional vehicle / transporter FKs for Assigned To target.
 */
export class Migration20261121133000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'add_group'`,
    )) as ColumnRow[];

    if (columns.length === 0) {
      return;
    }

    const names = new Set(columns.map((column) => column.COLUMN_NAME));

    if (!names.has("vehicle")) {
      await this.execute(
        `ALTER TABLE add_group
         ADD COLUMN vehicle INT NULL,
         ADD CONSTRAINT fk_add_group_vehicle
           FOREIGN KEY (vehicle) REFERENCES add_vehicle (id)`,
      );
    }

    if (!names.has("transporter")) {
      await this.execute(
        `ALTER TABLE add_group
         ADD COLUMN transporter INT NULL,
         ADD CONSTRAINT fk_add_group_transporter
           FOREIGN KEY (transporter) REFERENCES add_transporter (id)`,
      );
    }
  }

  override async down(): Promise<void> {
    // Keep assignment columns on rollback.
  }
}
