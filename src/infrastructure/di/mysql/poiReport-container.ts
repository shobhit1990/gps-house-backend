import { container } from "tsyringe";
import { IPoiReportService } from "../../../services/interfaces/IPoiReportService";
import { PoiReportService } from "../../../services/PoiReportService";

export function registerPoiReportDependencies() {
  container.register<IPoiReportService>("IPoiReportService", PoiReportService);
}
