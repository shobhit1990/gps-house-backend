import { Migration } from "@mikro-orm/migrations";

interface ColumnRow {
  COLUMN_NAME: string;
}

/**
 * Driver Detail: document name + image upload rows (Upload Documents tab).
 */
export class Migration20261121141000 extends Migration {
  override async up(): Promise<void> {
    const tables = (await this.execute(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'driver_detail'`,
    )) as Array<{ TABLE_NAME: string }>;
    if (tables.length === 0) {
      return;
    }

    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'driver_detail'
         AND COLUMN_NAME = 'documents'`,
    )) as ColumnRow[];

    if (columns.length === 0) {
      await this.execute(
        `ALTER TABLE driver_detail
         ADD COLUMN documents JSON NULL`,
      );
      await this.execute(
        `UPDATE driver_detail
         SET documents = CAST('[]' AS JSON)
         WHERE documents IS NULL`,
      );
    }
  }

  override async down(): Promise<void> {
    // Keep documents column on rollback.
  }
}
