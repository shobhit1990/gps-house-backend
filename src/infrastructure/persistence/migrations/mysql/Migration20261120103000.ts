import { Migration } from "@mikro-orm/migrations";

/**
 * Previously added users.role_id. Superseded by Migration20261120130000
 * which stores the Role FK on users.user_type instead.
 */
export class Migration20261120103000 extends Migration {
  override async up(): Promise<void> {
    // Intentionally no-op for fresh installs.
  }

  override async down(): Promise<void> {
    // no-op
  }
}
