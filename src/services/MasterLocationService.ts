import { inject, injectable } from "tsyringe";
import { District } from "../domain/entities/mysql/District";
import { State } from "../domain/entities/mysql/State";
import { IDistrictRepository } from "../domain/repositories/mysql/IDistrictRepository";
import { IStateRepository } from "../domain/repositories/mysql/IStateRepository";
import {
  DistrictMasterItem,
  IMasterLocationService,
  StateMasterItem,
} from "./interfaces/IMasterLocationService";

@injectable()
export class MasterLocationService implements IMasterLocationService {
  constructor(
    @inject("IStateRepository")
    private readonly stateRepository: IStateRepository,
    @inject("IDistrictRepository")
    private readonly districtRepository: IDistrictRepository,
  ) {}

  async getStates(): Promise<StateMasterItem[]> {
    const states = await this.stateRepository.getStates();
    return states.map((state) => this.toStateMasterItem(state));
  }

  async getDistricts(stateId?: string): Promise<DistrictMasterItem[]> {
    const districts = await this.districtRepository.getDistricts(stateId);
    return districts.map((district) => this.toDistrictMasterItem(district));
  }

  private toStateMasterItem(state: State): StateMasterItem {
    return {
      id: state.externalId,
      stateCode: state.stateCode,
      stateName: state.stateName,
      status: state.status ?? null,
      reason: state.reason ?? null,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    };
  }

  private toDistrictMasterItem(district: District): DistrictMasterItem {
    return {
      id: district.externalId,
      districtCode: district.districtCode,
      districtName: district.districtName,
      state: {
        id: district.state.externalId,
        stateCode: district.state.stateCode,
        stateName: district.state.stateName,
      },
      status: district.status ?? null,
      reason: district.reason ?? null,
      createdAt: district.createdAt,
      updatedAt: district.updatedAt,
    };
  }
}
