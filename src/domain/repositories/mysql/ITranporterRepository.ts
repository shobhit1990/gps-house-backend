import { Transporter } from "../../entities/mysql/Transporter";

export interface ITransporterRepository {

    createTransporter(transporter : Transporter): Promise<Transporter>;

    getTransporter(): Promise<Transporter[]>;
    
    getTransporterById(externalId: string): Promise<Transporter | null>;
    
    updateTransporter(transporter: Transporter): Promise<Transporter>;
    
    deleteTransporter(externalId: string): Promise<void>;

}