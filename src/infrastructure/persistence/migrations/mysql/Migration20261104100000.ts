import { Migration } from "@mikro-orm/migrations";

interface UsernameColumn {
  CHARACTER_MAXIMUM_LENGTH: number;
}

export class Migration20261104100000 extends Migration {
  override async up(): Promise<void> {
    const [usernameColumn] = (await this.execute(
      `SELECT CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'user_name'`,
    )) as UsernameColumn[];

    if (usernameColumn && usernameColumn.CHARACTER_MAXIMUM_LENGTH < 255) {
      await this.execute(
        "ALTER TABLE users MODIFY COLUMN user_name VARCHAR(255) NOT NULL",
      );
    }
  }

  override down(): void {
    // Keep widened usernames to avoid truncating migrated accounts.
  }
}
