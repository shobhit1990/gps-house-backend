import { Language } from "../../entities/mysql/Language";

export interface ILanguageRepository {
    getLanguage(): Promise<Language[]>;
}