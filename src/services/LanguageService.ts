import { inject, injectable } from "tsyringe";
import { ILanguageRepository } from "../domain/repositories/mysql/ILanguageRepository";
import { ILanguageService } from "./interfaces/ILanguageService";

@injectable()
export class LanguageService implements ILanguageService{
    constructor(
        @inject("ILanguageRepository")
        private readonly languageRepository: ILanguageRepository
    ){}

     async getLanguage() {

        const language = await this.languageRepository.getLanguage();

        return language.map((language)=>({
            id: language.externalId,
            languageName: language.languageName,
        }))
    }
}