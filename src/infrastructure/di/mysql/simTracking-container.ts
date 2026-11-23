import { container } from "tsyringe";
import { ISimTrackingService } from "../../../services/interfaces/ISimTrackingService";
import { SimTrackingService } from "../../../services/SimTrackingService";

export function registerSimTrackingDependencies() {
  container.register<ISimTrackingService>(
    "ISimTrackingService",
    SimTrackingService,
  );
}
