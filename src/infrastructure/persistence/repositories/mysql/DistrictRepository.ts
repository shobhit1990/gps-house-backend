import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { District } from "../../../../domain/entities/mysql/District";
import { State } from "../../../../domain/entities/mysql/State";
import { IDistrictRepository } from "../../../../domain/repositories/mysql/IDistrictRepository";

@injectable()
export class DistrictRepository implements IDistrictRepository {
  constructor(private readonly em: EntityManager) {}

  async getDistricts(stateId?: string): Promise<District[]> {
    const em = this.em.fork();
    const state = stateId
      ? await em.findOne(State, { externalId: stateId, isDeleted: false })
      : undefined;
    if (stateId && !state) return [];

    return em.find(
      District,
      {
        isDeleted: false,
        ...(state ? { state } : {}),
      },
      {
        populate: ["state"],
      },
    );
  }
}
