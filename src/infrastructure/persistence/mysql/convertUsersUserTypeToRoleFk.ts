import type { AbstractSqlConnection } from "@mikro-orm/mysql";

type ExecuteFn = (sql: string) => Promise<unknown>;

interface ColumnMeta {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
}

/**
 * Replace enum `users.user_type` (+ optional `role_id`) with an INT FK named `user_type`.
 * Safe to call repeatedly; no-ops when already converted or tables are missing.
 *
 * Kept outside the migrations folder so MikroORM does not treat this as a migration.
 */
export async function convertUsersUserTypeToRoleFk(
  execute: ExecuteFn,
): Promise<void> {
  const tables = (await execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('users', 'role')`,
  )) as Array<{ TABLE_NAME: string }>;
  const tableNames = new Set(tables.map((row) => row.TABLE_NAME));
  if (!tableNames.has("users") || !tableNames.has("role")) {
    return;
  }

  const columns = (await execute(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('user_type', 'role_id', 'user_type_fk')`,
  )) as ColumnMeta[];

  const byName = new Map(columns.map((column) => [column.COLUMN_NAME, column]));
  const userTypeColumn = byName.get("user_type");
  const hasRoleId = byName.has("role_id");
  const hasTempFk = byName.has("user_type_fk");

  if (
    userTypeColumn &&
    ["int", "bigint", "mediumint", "smallint", "tinyint"].includes(
      userTypeColumn.DATA_TYPE.toLowerCase(),
    )
  ) {
    await ensureUserTypeForeignKey(execute);
    if (hasRoleId) {
      await dropRoleId(execute);
    }
    return;
  }

  if (!userTypeColumn && !hasRoleId && !hasTempFk) {
    return;
  }

  if (!hasTempFk) {
    await execute(
      "ALTER TABLE `users` ADD COLUMN `user_type_fk` INT UNSIGNED NULL",
    );
  }

  if (hasRoleId) {
    await execute(`
      UPDATE \`users\` u
      INNER JOIN \`role\` r ON r.id = u.role_id AND r.is_deleted = false
      SET u.user_type_fk = r.id
      WHERE u.user_type_fk IS NULL
    `);
  }

  if (
    userTypeColumn &&
    ["enum", "varchar", "char", "text"].includes(
      userTypeColumn.DATA_TYPE.toLowerCase(),
    )
  ) {
    // Role/users may use different collations (unicode_ci vs 0900_ai_ci).
    await execute(`
      UPDATE \`users\` u
      INNER JOIN \`role\` r
        ON CONVERT(r.role_code USING utf8mb4) COLLATE utf8mb4_unicode_ci
         = CONVERT(CAST(u.user_type AS CHAR) USING utf8mb4) COLLATE utf8mb4_unicode_ci
       AND r.is_deleted = false
      SET u.user_type_fk = r.id
      WHERE u.user_type_fk IS NULL
    `);
  }

  await execute(`
    UPDATE \`users\` u
    INNER JOIN \`role\` r
      ON r.role_code = 'USER'
     AND r.is_deleted = false
    SET u.user_type_fk = r.id
    WHERE u.user_type_fk IS NULL
  `);

  if (hasRoleId) {
    await dropRoleId(execute);
  }

  if (userTypeColumn) {
    await execute("ALTER TABLE `users` DROP COLUMN `user_type`");
  }

  await execute(
    "ALTER TABLE `users` CHANGE `user_type_fk` `user_type` INT UNSIGNED NULL",
  );
  await ensureUserTypeForeignKey(execute);
}

async function dropRoleId(execute: ExecuteFn): Promise<void> {
  const fkRows = (await execute(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
  )) as Array<{ CONSTRAINT_NAME: string }>;

  for (const row of fkRows) {
    await execute(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
    );
  }

  const indexRows = (await execute(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role_id'
       AND INDEX_NAME <> 'PRIMARY'`,
  )) as Array<{ INDEX_NAME: string }>;
  const indexNames = [...new Set(indexRows.map((row) => row.INDEX_NAME))];
  for (const indexName of indexNames) {
    await execute(`ALTER TABLE \`users\` DROP INDEX \`${indexName}\``);
  }

  await execute("ALTER TABLE `users` DROP COLUMN `role_id`");
}

async function ensureUserTypeForeignKey(execute: ExecuteFn): Promise<void> {
  const fkRows = (await execute(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'user_type'
       AND REFERENCED_TABLE_NAME = 'role'`,
  )) as Array<{ CONSTRAINT_NAME: string }>;

  if (fkRows.length > 0) {
    return;
  }

  const indexRows = (await execute(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'user_type'
       AND INDEX_NAME <> 'PRIMARY'`,
  )) as Array<{ INDEX_NAME: string }>;
  if (indexRows.length === 0) {
    await execute(
      "CREATE INDEX `users_user_type_index` ON `users` (`user_type`)",
    );
  }

  await execute(`
    ALTER TABLE \`users\`
    ADD CONSTRAINT \`users_user_type_foreign\`
    FOREIGN KEY (\`user_type\`) REFERENCES \`role\` (\`id\`)
    ON UPDATE CASCADE ON DELETE SET NULL
  `);
}

/** Run the conversion through a live MikroORM connection (startup path). */
export async function convertUsersUserTypeToRoleFkFromConnection(
  connection: AbstractSqlConnection,
): Promise<void> {
  await convertUsersUserTypeToRoleFk((sql) => connection.execute(sql));
}
