import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { MenuItem } from "../../../domain/entities/mysql/MenuItem";
import { MenuName } from "../../../domain/enums/MenuName";
import { MenuType } from "../../../domain/enums/MenuType";
import { Status } from "../../../domain/enums/status";

export class MenuItemSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    let ownerMenu = await em.findOne(MenuItem, { key: MenuName.Owner });

    if (!ownerMenu) {
      ownerMenu = new MenuItem();
    }

    ownerMenu.priority = 1;
    ownerMenu.key = MenuName.Owner;
    ownerMenu.label = "Owner";
    ownerMenu.url = "/owner";
    ownerMenu.icon = "users";
    ownerMenu.menuType = MenuType.Both;
    ownerMenu.isTitle = false;
    ownerMenu.showInMenu = true;
    ownerMenu.view = true;
    ownerMenu.add = true;
    ownerMenu.edit = true;
    ownerMenu.delete = true;
    ownerMenu.filter = true;
    ownerMenu.print = true;
    ownerMenu.excel = true;
    ownerMenu.status = Status.ACTIVE;
    ownerMenu.isDeleted = false;

    await em.persistAndFlush(ownerMenu);
  }
}
