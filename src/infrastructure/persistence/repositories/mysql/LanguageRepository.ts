import { injectable } from "tsyringe";
import { ILanguageRepository } from "../../../../domain/repositories/mysql/ILanguageRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { Language } from "../../../../domain/entities/mysql/Language";

@injectable()
export class LanguageRepository implements ILanguageRepository {
    constructor(private readonly em: EntityManager) {}

    async getLanguage(): Promise<Language[]> {
    const emFork = this.em.fork();

    return await emFork.find(Language, {
        isDeleted: false,
    });
}
}