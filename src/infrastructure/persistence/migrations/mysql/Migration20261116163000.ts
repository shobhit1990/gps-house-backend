import { Migration } from "@mikro-orm/migrations";
import { Shapes } from "../../../../domain/enums/Shapes";

interface ColumnRow {
  COLUMN_TYPE: string;
}

export class Migration20261116163000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'
         AND COLUMN_NAME = 'shapes'`,
    )) as ColumnRow[];

    if (columns.length === 0) {
      return;
    }

    const columnType = columns[0].COLUMN_TYPE.toLowerCase();
    if (!columnType.includes("'circle'")) {
      return;
    }
    

    await this.execute(
      `UPDATE geofence
       SET shapes = 'circle'
       WHERE shapes = 'circle'`,
    );

    const values = Object.values(Shapes)
      .map((shape) => `'${shape.replace(/'/g, "''")}'`)
      .join(", ");

    await this.execute(
      `ALTER TABLE geofence
       MODIFY COLUMN shapes ENUM(${values}) NULL`,
    );
  }

  override down(): void {
    // Keep corrected shape values when rolling back.
  }
}
