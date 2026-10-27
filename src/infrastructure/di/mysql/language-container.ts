import { container } from "tsyringe";
import { ILanguageRepository } from "../../../domain/repositories/mysql/ILanguageRepository";
import { LanguageRepository } from "../../persistence/repositories/mysql/LanguageRepository";
import { ILanguageService } from "../../../services/interfaces/ILanguageService";
import { LanguageService } from "../../../services/LanguageService";

export function registerLanguageDependencies() {
  container.register<ILanguageRepository>("ILanguageRepository", {
    useClass: LanguageRepository,
  });

  container.register<ILanguageService>("ILanguageService", {
    useClass: LanguageService,
  });
}