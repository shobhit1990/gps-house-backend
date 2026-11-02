import { State } from "../../entities/mysql/State";

export interface IStateRepository {
  getStates(): Promise<State[]>;
}
