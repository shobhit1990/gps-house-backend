import { Migration } from "@mikro-orm/migrations";

interface CountRow {
  count: number;
}

export class Migration20261118113000 extends Migration {
  override async up(): Promise<void> {
    const tableRows = (await this.execute(
      `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'`,
    )) as CountRow[];

    if (!tableRows[0] || Number(tableRows[0].count) === 0) return;

    await this.execute(
      `UPDATE geofence
       SET latitude = JSON_EXTRACT(latitude, '$[0]')
       WHERE JSON_TYPE(latitude) = 'ARRAY'`,
    );
    await this.execute(
      `UPDATE geofence
       SET longitude = JSON_EXTRACT(longitude, '$[0]')
       WHERE JSON_TYPE(longitude) = 'ARRAY'`,
    );
  }

  override down(): void {
    // Keep scalar JSON coordinates; converting them back to arrays is lossy for intent.
  }
}
