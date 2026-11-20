import { Migration } from "@mikro-orm/migrations";

interface UserTypeColumn {
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: "YES" | "NO";
  COLUMN_DEFAULT: string | null;
}

const PLATFORM_USER_TYPES = ["SUPER_ADMIN", "ADMIN"];

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
    if (index >= definition.length) break;
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

/**
 * Allow user_type to store SUPER_ADMIN / ADMIN and copy those values from role.
 */
export class Migration20261120120000 extends Migration {
  override async up(): Promise<void> {
    const tables = (await this.execute(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'`,
    )) as Array<{ TABLE_NAME: string }>;
    if (tables.length === 0) {
      return;
    }

    const columns = (await this.execute(
      `SELECT DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'user_type'`,
    )) as UserTypeColumn[];
    const userTypeColumn = columns[0];
    if (!userTypeColumn) {
      return;
    }
    if (userTypeColumn.DATA_TYPE.toLowerCase() !== "enum") {
      // Already converted to Role FK (or never an enum on this DB).
      return;
    }

    const existingValues = parseEnumValues(userTypeColumn.COLUMN_TYPE);
    const missingValues = PLATFORM_USER_TYPES.filter(
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

      this.addSql(
        `alter table \`users\` modify \`user_type\` enum(${values}) ${nullable} ${defaultClause};`,
      );
    }

    const roleColumn = (await this.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'role_id'`,
    )) as Array<{ COLUMN_NAME: string }>;
    const roleTable = (await this.execute(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'role'`,
    )) as Array<{ TABLE_NAME: string }>;
    if (roleColumn.length === 0 || roleTable.length === 0) {
      return;
    }

    this.addSql(`
      update \`users\` u
      inner join \`role\` r
        on r.id = u.role_id
       and r.is_deleted = false
       and r.role_code in ('SUPER_ADMIN', 'ADMIN')
      set u.user_type = r.role_code
      where u.user_type <> r.role_code;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      update \`users\`
      set \`user_type\` = 'USER'
      where \`user_type\` in ('SUPER_ADMIN', 'ADMIN');
    `);
    this.addSql(
      "alter table `users` modify `user_type` enum('USER', 'CLIENT', 'TRANSPORTER', 'TECHNICIAN') not null default 'USER';",
    );
  }
}
