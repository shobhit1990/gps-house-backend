import { Client } from "../../entities/mysql/Client";
import { Geofence } from "../../entities/mysql/Geofence";

export interface IGeofenceRepository {
  getGeofences(): Promise<Geofence[]>;

  getGeofenceById(externalId: string): Promise<Geofence | null>;

  createGeofence(geofence: Geofence): Promise<Geofence>;

  updateGeofence(geofence: Geofence): Promise<Geofence>;

  deleteGeofence(externalId: string, deletedBy?: Client): Promise<void>;
}
