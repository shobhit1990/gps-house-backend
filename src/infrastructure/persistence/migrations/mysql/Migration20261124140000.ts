import { Migration } from "@mikro-orm/migrations";

interface ColumnRow {
  COLUMN_NAME: string;
}

/**
 * Payment Details: optional vehicle FK when type = vehicle.
 */
export class Migration20261124140000 extends Migration {
  override async up(): Promise<void> {
    const tables = (await this.execute(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_details'`,
    )) as Array<{ TABLE_NAME: string }>;
    if (tables.length === 0) {
      return;
    }

    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_details'
         AND COLUMN_NAME = 'vehicle'`,
    )) as ColumnRow[];

    if (columns.length === 0) {
      await this.execute(
        `ALTER TABLE payment_details
         ADD COLUMN vehicle INT NULL,
         ADD CONSTRAINT fk_payment_details_vehicle
           FOREIGN KEY (vehicle) REFERENCES add_vehicle (id)`,
      );
    }
  }

  override async down(): Promise<void> {
    // Keep vehicle column on rollback.
  }
}
