import { Migration } from "@mikro-orm/migrations";

interface CountRow {
  count: number | string;
}

/**
 * role_menu_permissions may already exist from schemaGenerator.updateSchema()
 * (entity RoleMenuPermission) including FK names. Keep this migration idempotent
 * so a partial prior run / schema sync does not crash startup.
 */
export class Migration20261119150000 extends Migration {
  override async up(): Promise<void> {
    const tableRows = (await this.execute(
      `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'role_menu_permissions'`,
    )) as CountRow[];

    const tableExists = !!tableRows[0] && Number(tableRows[0].count) > 0;
    if (tableExists) {
      return;
    }

    await this.execute(`
      create table \`role_menu_permissions\` (
        \`id\` int unsigned not null auto_increment primary key,
        \`external_id\` varchar(255) not null,
        \`role_id\` int unsigned not null,
        \`menu_item_id\` int unsigned not null,
        \`view\` tinyint(1) not null default false,
        \`add\` tinyint(1) not null default false,
        \`edit\` tinyint(1) not null default false,
        \`delete\` tinyint(1) not null default false,
        \`filter\` tinyint(1) not null default false,
        \`print\` tinyint(1) not null default false,
        \`excel\` tinyint(1) not null default false,
        \`created_by_id\` int null,
        \`updated_by_id\` int null,
        \`status\` enum('active', 'inactive', 'pending') not null default 'active',
        \`is_deleted\` tinyint(1) not null default false,
        \`deleted_by_id\` int null,
        \`deleted_at\` datetime null,
        \`created_at\` datetime not null,
        \`updated_at\` datetime not null,
        unique \`role_menu_permissions_external_id_unique\`(\`external_id\`),
        unique \`role_menu_permissions_role_id_menu_item_id_unique\`(\`role_id\`, \`menu_item_id\`),
        constraint \`role_menu_permissions_role_id_foreign\`
          foreign key (\`role_id\`) references \`role\` (\`id\`) on update cascade,
        constraint \`role_menu_permissions_menu_item_id_foreign\`
          foreign key (\`menu_item_id\`) references \`menu_items\` (\`id\`) on update cascade,
        constraint \`role_menu_permissions_created_by_id_foreign\`
          foreign key (\`created_by_id\`) references \`client\` (\`id\`)
          on update cascade on delete set null,
        constraint \`role_menu_permissions_updated_by_id_foreign\`
          foreign key (\`updated_by_id\`) references \`client\` (\`id\`)
          on update cascade on delete set null,
        constraint \`role_menu_permissions_deleted_by_id_foreign\`
          foreign key (\`deleted_by_id\`) references \`client\` (\`id\`)
          on update cascade on delete set null
      ) default character set utf8mb4 engine = InnoDB;
    `);
  }

  override async down(): Promise<void> {
    await this.execute(`drop table if exists \`role_menu_permissions\`;`);
  }
}
