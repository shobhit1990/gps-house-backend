import { Migration } from "@mikro-orm/migrations";

interface DateColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

interface ValueCount {
  count: number;
}

const authDateColumns = [
  "otp_expires_at",
  "otp_sent_at",
  "refresh_token_expires_at",
];

export class Migration20261104110000 extends Migration {
  override async up(): Promise<void> {
    const dateColumns = (await this.execute(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN (${authDateColumns.map(() => "?").join(", ")})`,
      authDateColumns,
    )) as DateColumn[];
    const existingColumns = new Map(
      dateColumns.map(({ COLUMN_NAME, DATA_TYPE }) => [COLUMN_NAME, DATA_TYPE]),
    );

    for (const column of authDateColumns) {
      const dataType = existingColumns.get(column);
      if (!dataType || dataType === "datetime" || dataType === "timestamp") {
        continue;
      }

      const [{ count }] = (await this.execute(
        `SELECT COUNT(*) AS count FROM users WHERE \`${column}\` IS NOT NULL`,
      )) as ValueCount[];
      if (count > 0) {
        throw new Error(
          `Cannot safely convert populated users.${column} values to DATETIME`,
        );
      }

      await this.execute(
        `ALTER TABLE users MODIFY COLUMN \`${column}\` DATETIME NULL`,
      );
    }
  }

  override down(): void {
    // Keep corrected timestamp types to avoid lossy rollback conversions.
  }
}
