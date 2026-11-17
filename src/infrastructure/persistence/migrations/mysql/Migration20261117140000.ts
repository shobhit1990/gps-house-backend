import { Migration } from "@mikro-orm/migrations";

interface GeofenceColumn {
  COLUMN_NAME: string;
}

export class Migration20261117140000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'`,
    )) as GeofenceColumn[];

    if (
      columns.length === 0 ||
      columns.some(({ COLUMN_NAME }) => COLUMN_NAME === "radius")
    ) {
      return;
    }

    await this.execute(
      `ALTER TABLE geofence
       ADD COLUMN radius DOUBLE NULL`,
    );
  }

  override down(): void {
    // Keep geofence radius data when rolling back.
  }
}
