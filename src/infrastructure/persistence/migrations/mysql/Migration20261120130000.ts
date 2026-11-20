import { Migration } from "@mikro-orm/migrations";
import { convertUsersUserTypeToRoleFk } from "../../mysql/convertUsersUserTypeToRoleFk";

/**
 * Drop role_id and turn users.user_type into a Role FK (replacing the enum).
 */
export class Migration20261120130000 extends Migration {
  override async up(): Promise<void> {
    await convertUsersUserTypeToRoleFk((sql) => this.execute(sql));
  }

  override async down(): Promise<void> {
    // Irreversible without restoring enum values from role.role_code.
  }
}
