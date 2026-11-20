import { GpsListenerConfig } from "./IVehicleGpsListener";
import { IVehicleGpsListener } from "./IVehicleGpsListener";

export interface GpsCommandSendResult {
  ok: boolean;
  serialNumber?: string;
  sentPacketHex?: string;
  error?: string;
}

export interface IVehicleGpsListenerManager {
  initializeListeners(): Promise<void>;
  startAllListeners(): Promise<void>;
  stopAllListeners(): Promise<void>;
  getListener(name: string): IVehicleGpsListener | undefined;
  getAllListeners(): IVehicleGpsListener[];
  getListenerStatus(): Array<{
    name: string;
    running: boolean;
    connections: number;
    deviceImeis: string[];
  }>;
  /** Sends over local TCP sockets, or via Redis to gps-worker when listeners are disabled. */
  sendCommand(deviceImei: string, commandText: string): Promise<GpsCommandSendResult>;
  isDeviceConnected(deviceImei: string): boolean;
  listConnectedDeviceImeis(): string[];
}
