import { Client } from "../../entities/mysql/Client";
import { TransferCoin } from "../../entities/mysql/TransferCoin";

export interface ITransferCoinRepository {
  getTransferCoins(): Promise<TransferCoin[]>;
  getTransferCoinById(externalId: string): Promise<TransferCoin | null>;
  createTransferCoin(transferCoin: TransferCoin): Promise<TransferCoin>;
  updateTransferCoin(transferCoin: TransferCoin): Promise<TransferCoin>;
  deleteTransferCoin(externalId: string, deletedBy?: Client): Promise<void>;
}
