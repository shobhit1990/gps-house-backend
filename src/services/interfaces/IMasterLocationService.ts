import { Status } from "../../domain/enums/status";

export interface StateMasterItem {
  id: string;
  stateCode: string;
  stateName: string;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistrictMasterItem {
  id: string;
  districtCode: string;
  districtName: string;
  state: {
    id: string;
    stateCode: string;
    stateName: string;
  };
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMasterLocationService {
  getStates(): Promise<StateMasterItem[]>;
  getDistricts(stateId?: string): Promise<DistrictMasterItem[]>;
}
