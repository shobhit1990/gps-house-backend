import { CreateTransporterDto, updateTransporterDto } from "../../domain/dto/TransporterDto";
import { Transporter } from "../../domain/entities/mysql/Transporter";

export interface ITransporterService {

    getTransporter(): Promise<Transporter[]>;

    getTransporterById(externalId: string): Promise<Transporter | null>;

    createTransporter(
        payload: CreateTransporterDto,
        actorUserId: number
    ): Promise<Transporter>;

    updateTransporter(
        externalId: string,
        payload: updateTransporterDto,
    ): Promise<Transporter>;

    deleteTransporter(
        externalId: string,
    ): Promise<void>;
}