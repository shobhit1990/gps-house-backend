import { Migration } from "@mikro-orm/migrations";

interface UserColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: "YES" | "NO";
  COLUMN_DEFAULT: string | null;
}

const requiredUserTypes = ["USER", "CLIENT", "TRANSPORTER", "TECHNICIAN"];

function parseEnumValues(columnType: string): string[] {
  const match = /^enum\((.*)\)$/i.exec(columnType);
  if (!match) {
    throw new Error(`Unexpected user_type column definition: ${columnType}`);
  }

  const values: string[] = [];
  const definition = match[1];
  let index = 0;

  while (index < definition.length) {
    while (definition[index] === " " || definition[index] === ",") index++;
    if (definition[index] !== "'") {
      throw new Error(`Unable to parse user_type definition: ${columnType}`);
    }

    index++;
    let value = "";
    let closed = false;
    while (index < definition.length) {
      const character = definition[index++];
      if (character === "\\") {
        if (index >= definition.length) {
          throw new Error(
            `Unable to parse user_type definition: ${columnType}`,
          );
        }
        value += definition[index++];
      } else if (character === "'") {
        if (definition[index] === "'") {
          value += "'";
          index++;
        } else {
          closed = true;
          break;
        }
      } else {
        value += character;
      }
    }

    if (!closed) {
      throw new Error(`Unable to parse user_type definition: ${columnType}`);
    }
    values.push(value);
  }

  return values;
}

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export class Migration20261103200000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('user_type', 'imei_number')`,
    )) as UserColumn[];

    const userTypeColumn = columns.find(
      (column) => column.COLUMN_NAME === "user_type",
    );
    if (!userTypeColumn) {
      await this.execute(`
        ALTER TABLE users
        ADD COLUMN user_type ENUM('USER', 'CLIENT', 'TRANSPORTER', 'TECHNICIAN')
          NOT NULL DEFAULT 'USER'
      `);
    } else {
      if (userTypeColumn.DATA_TYPE.toLowerCase() !== "enum") {
        throw new Error(
          `Cannot safely update users.user_type with data type ${userTypeColumn.DATA_TYPE}`,
        );
      }

      const existingValues = parseEnumValues(userTypeColumn.COLUMN_TYPE);
      const missingValues = requiredUserTypes.filter(
        (value) => !existingValues.includes(value),
      );
      if (missingValues.length > 0) {
        const values = [...existingValues, ...missingValues]
          .map(escapeSqlString)
          .join(", ");
        const nullable =
          userTypeColumn.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
        const defaultClause =
          userTypeColumn.COLUMN_DEFAULT === null
            ? ""
            : `DEFAULT ${escapeSqlString(userTypeColumn.COLUMN_DEFAULT)}`;

        await this.execute(`
          ALTER TABLE users
          MODIFY COLUMN user_type ENUM(${values}) ${nullable} ${defaultClause}
        `);
      }
    }

    if (!columns.some((column) => column.COLUMN_NAME === "imei_number")) {
      await this.execute(
        "ALTER TABLE users ADD COLUMN imei_number VARCHAR(255) NULL",
      );
    }
  }

  override down(): void {
    // The columns may have existed before this migration; dropping them is unsafe.
  }
}
