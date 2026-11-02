import { container } from "tsyringe";
import { ITransferCoinRepository } from "../../../domain/repositories/mysql/ITransferCoinRepository";
import { TransferCoinRepository } from "../../persistence/repositories/mysql/TransferCoinRepository";
import { ITransferCoinService } from "../../../services/interfaces/ITransferCoinService";
import { TransferCoinService } from "../../../services/TransferCoinService";

export function registerTransferCoinDependencies() {
  container.register<ITransferCoinRepository>(
    "ITransferCoinRepository",
    TransferCoinRepository,
  );
  container.register<ITransferCoinService>(
    "ITransferCoinService",
    TransferCoinService,
  );
}
