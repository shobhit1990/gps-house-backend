import {
  CreateContactUsDto,
  UpdateContactUsDto,
} from "../../domain/dto/ContactUsDto";
import { Status } from "../../domain/enums/status";

export interface ContactUsResponse {
  id: string;
  name: string;
  mobile: string;
  email: string;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IContactUsService {
  getContactUsList(): Promise<ContactUsResponse[]>;
  getContactUsById(externalId: string): Promise<ContactUsResponse>;
  createContactUs(
    payload: CreateContactUsDto,
    actorUserId?: number,
  ): Promise<ContactUsResponse>;
  updateContactUs(
    externalId: string,
    payload: UpdateContactUsDto,
    actorUserId?: number,
  ): Promise<ContactUsResponse>;
  deleteContactUs(externalId: string, actorUserId?: number): Promise<void>;
}
