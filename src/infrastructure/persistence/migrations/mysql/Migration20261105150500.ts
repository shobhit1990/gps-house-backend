import { Migration } from "@mikro-orm/migrations";
import { Shapes } from "../../../../domain/enums/Shapes";

interface GeofenceColumn {
  COLUMN_NAME: string;
}

export class Migration20261105150500 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'`,
    )) as GeofenceColumn[];

    if (
      columns.length === 0 ||
      columns.some(({ COLUMN_NAME }) => COLUMN_NAME === "shapes")
    ) {
      return;
    }

    const values = Object.values(Shapes)
      .map((shape) => `'${shape.replace(/'/g, "''")}'`)
      .join(", ");

    await this.execute(
      `ALTER TABLE geofence
       ADD COLUMN shapes ENUM(${values}) NULL`,
    );
  }

  override down(): void {
    // Keep geofence shape data when rolling back.
  }
}
