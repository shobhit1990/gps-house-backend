import { GpsLocationData, GpsStatusData } from "../../domain/models/GpsTrackingData";
import { GpsCommandSendResult } from "./IVehicleGpsListenerManager";

export interface GpsListenerConfig {
  name: string;
  port: number;
  protocol: "GT800N" | "GT801N" | "CUSTOM";
  enabled: boolean;
  maxConnections?: number;
}

export interface IVehicleGpsListener {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getConfig(): GpsListenerConfig;
  getActiveConnections(): number;
  listConnectedDeviceImeis(): string[];
  isDeviceConnected(deviceImei: string): boolean;
  sendCommand(deviceImei: string, commandText: string): GpsCommandSendResult;
}
