import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../../domain/dto/AnnouncementDto";
import { AnnounceMent } from "../../domain/enums/AnnounceMent";
import { messageType } from "../../domain/enums/MessageType";
import { Status } from "../../domain/enums/status";
import { Validity } from "../../domain/enums/Validity";

export interface AnnouncementResponse {
  id: string;
  announcement: AnnounceMent;
  client: { id: string; name: string };
  transporter: { id: string; companyName: string } | null;
  validityTime: Validity;
  validityDuration: number;
  messageType: messageType;
  title: string;
  body: string | null;
  messageImage: string | null;
  requestForDontShowAgainOption: boolean;
  requestForProfileUpdate: boolean;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnouncementService {
  getAnnouncements(): Promise<AnnouncementResponse[]>;
  getAnnouncementById(externalId: string): Promise<AnnouncementResponse>;
  createAnnouncement(
    payload: CreateAnnouncementDto,
    actorUserId?: number,
    messageImage?: string,
  ): Promise<AnnouncementResponse>;
  updateAnnouncement(
    externalId: string,
    payload: UpdateAnnouncementDto,
    actorUserId?: number,
    messageImage?: string,
  ): Promise<AnnouncementResponse>;
  deleteAnnouncement(externalId: string, actorUserId?: number): Promise<void>;
}
