import { ObjectId } from 'mongodb';

/** Latest vehicle GPS position per device — avoids scanning all monthly collections on ingest. */
export interface VehicleGpsTrackingLatestDocument {
  _id?: ObjectId;
  deviceImei: string;
  vehicleId: string;
  vehicleNumber: string;
  locationTime: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  satellite?: number;
  distance?: number;
  sourceCollection: string;
  updatedAt: Date;
}
