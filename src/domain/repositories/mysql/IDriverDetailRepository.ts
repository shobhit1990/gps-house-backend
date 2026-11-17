import { Client } from "../../entities/mysql/Client";
import { DriverDetail } from "../../entities/mysql/DriverDetail";

export interface IDriverDetailRepository {
  getDriverDetails(): Promise<DriverDetail[]>;

  getDriverDetailById(externalId: string): Promise<DriverDetail | null>;

  createDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail>;

  updateDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail>;

  deleteDriverDetail(externalId: string, deletedBy?: Client): Promise<void>;
}
