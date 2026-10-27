import { MenuItem } from "../../entities/mysql/MenuItem";

export interface IMenuItemRepository {
  getMenuItemByFilter(
    populate: any[],
    filter: Record<string, any>,
    fields: (keyof MenuItem)[],
  ): Promise<MenuItem | null>;

  getMenuByFilter(
    populate: any[],
    filter: Record<string, any>,
    fields: (keyof MenuItem)[],
  ): Promise<MenuItem[]>;

  getMenuByFilterPaginated(
    populate: any[],
    filter: Record<string, any>,
    fields: (keyof MenuItem)[],
    options: {
      page: number;
      limit: number;
      search?: string;
      sort?: "asc" | "desc";
    },
  ): Promise<{ data: MenuItem[]; total: number }>;

  updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem>;
}
