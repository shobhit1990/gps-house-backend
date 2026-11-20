import { Migration } from "@mikro-orm/migrations";

export class Migration20261119160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `policy` modify `body` longtext not null;",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "alter table `policy` modify `body` text not null;",
    );
  }
}
