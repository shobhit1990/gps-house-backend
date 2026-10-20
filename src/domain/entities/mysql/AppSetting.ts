import { Entity, PrimaryKey, Property, Unique } from "@mikro-orm/core";

/**
 * Minimal bootstrap entity so MikroORM has at least one MySQL entity.
 * Replace / extend with real domain entities as features are added.
 */
@Entity({ tableName: "app_settings" })
export class AppSetting {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({ length: 100 })
  @Unique()
  key!: string;

  @Property({ type: "text", nullable: true })
  value?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
