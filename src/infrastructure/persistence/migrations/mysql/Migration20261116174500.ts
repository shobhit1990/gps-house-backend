import { Migration } from "@mikro-orm/migrations";
import { Shapes } from "../../../../domain/enums/Shapes";

interface ColumnRow {
  COLUMN_TYPE: string;
}

/** Historical DB typo — convert away; never use as an app value. */
const LEGACY_MISSPELLED_CIRCLE = "cirlce";

function parseEnumValues(columnType: string): string[] {
  const match = columnType.match(/^enum\((.*)\)$/i);
  if (!match) return [];
  return [...match[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) =>
    m[1].replace(/\\'/g, "'"),
  );
}

function quoteEnumValues(values: string[]): string {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

export class Migration20261116174500 extends Migration {
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

    const existingValues = parseEnumValues(columns[0].COLUMN_TYPE);
    if (
      existingValues.length === 0 ||
      !existingValues.includes(LEGACY_MISSPELLED_CIRCLE)
    ) {
      return;
    }

    const correctCircle = Shapes.CIRCLE;

    // 1) Expand ENUM so both the legacy typo and "circle" are allowed.
    const expanded = Array.from(
      new Set([...existingValues, correctCircle, ...Object.values(Shapes)]),
    );
    await this.execute(
      `ALTER TABLE geofence
       MODIFY COLUMN shapes ENUM(${quoteEnumValues(expanded)}) NULL`,
    );

    // 2) Convert legacy rows to the correct spelling.
    await this.execute(
      `UPDATE geofence
       SET shapes = '${correctCircle.replace(/'/g, "''")}'
       WHERE shapes = '${LEGACY_MISSPELLED_CIRCLE.replace(/'/g, "''")}'`,
    );

    // 3) Shrink ENUM to the corrected shape values only.
    await this.execute(
      `ALTER TABLE geofence
       MODIFY COLUMN shapes ENUM(${quoteEnumValues(Object.values(Shapes))}) NULL`,
    );
  }

  override down(): void {
    // Keep corrected shape values when rolling back.
  }
}
