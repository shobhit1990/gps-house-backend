import { District } from "../../entities/mysql/District";

export interface IDistrictRepository {
  getDistricts(stateId?: string): Promise<District[]>;
}
