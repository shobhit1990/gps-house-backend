import { container } from "tsyringe";
import { IRegisterMobileReportService } from "../../../services/interfaces/IRegisterMobileReportService";
import { RegisterMobileReportService } from "../../../services/RegisterMobileReportService";

export function registerRegisterMobileReportDependencies() {
  container.register<IRegisterMobileReportService>(
    "IRegisterMobileReportService",
    RegisterMobileReportService,
  );
}
