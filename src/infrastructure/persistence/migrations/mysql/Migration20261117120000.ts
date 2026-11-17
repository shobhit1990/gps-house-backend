import { Migration } from "@mikro-orm/migrations";
import { GeoType } from "../../../../domain/enums/GeoType";

interface GeofenceColumn {
  COLUMN_NAME: string;
}

export class Migration20261117120000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'`,
    )) as GeofenceColumn[];

    if (
      columns.length === 0 ||
      columns.some(({ COLUMN_NAME }) => COLUMN_NAME === "geoType")
    ) {
      return;
    }

    const values = Object.values(GeoType)
      .map((geoType) => `'${geoType.replace(/'/g, "''")}'`)
      .join(", ");

    await this.execute(
      `ALTER TABLE geofence
       ADD COLUMN geoType ENUM(${values}) NULL`,
    );
  }

  override down(): void {
    // Keep geofence geoType data when rolling back.
  }
}
