import {
  CreateTransferCoinDto,
  UpdateTransferCoinDto,
} from "../../domain/dto/TransferCoinDto";
import { AssignTo } from "../../domain/enums/AssignTo";
import { Status } from "../../domain/enums/status";

export interface TransferCoinResponse {
  id: string;
  assignTo: AssignTo;
  client: { id: string; name: string | null; companyName: string } | null;
  transporter: {
    id: string;
    name: string | null;
    companyName: string;
  } | null;
  coins: number;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransferCoinService {
  getTransferCoins(): Promise<TransferCoinResponse[]>;
  getTransferCoinById(externalId: string): Promise<TransferCoinResponse>;
  createTransferCoin(
    payload: CreateTransferCoinDto,
    actorUserId?: number,
  ): Promise<TransferCoinResponse>;
  updateTransferCoin(
    externalId: string,
    payload: UpdateTransferCoinDto,
    actorUserId?: number,
  ): Promise<TransferCoinResponse>;
  deleteTransferCoin(externalId: string, actorUserId?: number): Promise<void>;
}
