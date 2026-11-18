import { Client } from "../../entities/mysql/Client";
import { DriverDetail } from "../../entities/mysql/DriverDetail";

export interface DriverDetailBulkCreateResult {
  insertedRecords: number;
}

export interface IDriverDetailRepository {
  getDriverDetails(): Promise<DriverDetail[]>;

  getDriverDetailById(externalId: string): Promise<DriverDetail | null>;

  createDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail>;

  bulkCreateDriverDetails(
    driverDetails: DriverDetail[],
  ): Promise<DriverDetailBulkCreateResult>;

  updateDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail>;

  deleteDriverDetail(externalId: string, deletedBy?: Client): Promise<void>;
}
