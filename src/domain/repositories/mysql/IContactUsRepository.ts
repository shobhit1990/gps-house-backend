import { ContactUs } from "../../entities/mysql/ContactUs";
import { Client } from "../../entities/mysql/Client";

export interface IContactUsRepository {
  getContactUsList(): Promise<ContactUs[]>;
  getContactUsById(externalId: string): Promise<ContactUs | null>;
  createContactUs(contactUs: ContactUs): Promise<ContactUs>;
  updateContactUs(contactUs: ContactUs): Promise<ContactUs>;
  deleteContactUs(externalId: string, deletedBy?: Client): Promise<void>;
}
