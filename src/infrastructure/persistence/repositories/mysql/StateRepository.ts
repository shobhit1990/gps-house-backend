import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { State } from "../../../../domain/entities/mysql/State";
import { IStateRepository } from "../../../../domain/repositories/mysql/IStateRepository";

@injectable()
export class StateRepository implements IStateRepository {
  constructor(private readonly em: EntityManager) {}

  async getStates(): Promise<State[]> {
    return this.em.fork().find(State, { isDeleted: false });
  }
}
