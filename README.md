# gps-house-backend

## MySQL menu seed

The owner sidebar menu is stored in the `menu_items` table. After the MySQL schema
has been created, run the idempotent seeder with:

```sh
npm run seed:mysql
```

This creates or refreshes the single Owner menu entry.

## Menu item API

The menu routes are mounted under `/api/menu`:

- `GET /sidebar` returns the visible menu tree. Optional query parameters:
  `menuType=WEB|MOBILE|BOTH` and `includeAllMenus=true`.
- `GET /get-all` and `GET /get-all/paginated` list active menu items.
- `GET /get-by-id/:externalId` returns one menu item.
- `PUT /update/:externalId` updates an existing menu item.

Use the menu item's external `id` (UUID) in item routes. Menu items are created
by the MySQL seeder. There are no API create or delete routes.
