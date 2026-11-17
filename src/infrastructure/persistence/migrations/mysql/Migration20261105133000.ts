import { Migration } from "@mikro-orm/migrations";

interface GeofenceColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

interface CountRow {
  count: number;
}

const coordinateColumns = ["latitude", "longitude"] as const;
const numericTypes = new Set([
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "bigint",
  "decimal",
  "float",
  "double",
]);

export class Migration20261105133000 extends Migration {
  override async up(): Promise<void> {
    const tableRows = (await this.execute(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'geofence'`,
    )) as GeofenceColumn[];

    if (tableRows.length === 0) return;

    const columns = new Map(
      tableRows.map(({ COLUMN_NAME, DATA_TYPE }) => [
        COLUMN_NAME,
        DATA_TYPE.toLowerCase(),
      ]),
    );
    const convertedColumns: string[] = [];

    for (const column of coordinateColumns) {
      const dataType = columns.get(column);
      if (!dataType) {
        throw new Error(`Cannot migrate geofence: ${column} column not found`);
      }
      if (dataType === "json") continue;
      if (!numericTypes.has(dataType)) {
        throw new Error(
          `Cannot safely migrate geofence.${column} from ${dataType} to JSON`,
        );
      }

      const stagingColumn = `${column}_array`;
      if (!columns.has(stagingColumn)) {
        await this.execute(
          `ALTER TABLE geofence ADD COLUMN \`${stagingColumn}\` JSON NULL`,
        );
      }

      await this.execute(
        `UPDATE geofence
         SET \`${stagingColumn}\` = JSON_ARRAY(\`${column}\`)
         WHERE \`${stagingColumn}\` IS NULL AND \`${column}\` IS NOT NULL`,
      );

      const [{ count }] = (await this.execute(
        `SELECT COUNT(*) AS count
         FROM geofence
         WHERE \`${stagingColumn}\` IS NULL`,
      )) as CountRow[];
      if (Number(count) > 0) {
        throw new Error(
          `Cannot safely migrate geofence.${column}: ${count} rows have no coordinate value`,
        );
      }

      convertedColumns.push(column);
    }

    if (convertedColumns.length > 0) {
      const changes = convertedColumns
        .flatMap((column) => [
          `DROP COLUMN \`${column}\``,
          `CHANGE COLUMN \`${column}_array\` \`${column}\` JSON NOT NULL`,
        ])
        .join(",\n");
      await this.execute(`ALTER TABLE geofence ${changes}`);
    }
  }

  override down(): void {
    // Keep coordinate arrays intact; converting them back to scalar columns is lossy.
  }
}
