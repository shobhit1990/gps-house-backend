import { container, injectable } from "tsyringe";
import { IVehicleGpsListenerManager, GpsCommandSendResult } from "./interfaces/IVehicleGpsListenerManager";
import { IVehicleGpsListener, GpsListenerConfig } from "./interfaces/IVehicleGpsListener";
import { IVehicleGpsQueue } from "./interfaces/IVehicleGpsQueue";
import { IVehicleGpsDeviceResolver } from "./interfaces/IVehicleGpsDeviceResolver";
import { logger } from "../configs/logger";
import { VehicleGpsListener } from "./VehicleGpsListener";
import { isVehicleGpsListenerEnabled } from "../utils/vehicleGpsRuntime";
import { parseGpsListenersFromEnv } from "../utils/gpsListenerEnv";

/**
 * Starts one TCP listener per GPS_LISTENERS entry (name:port:protocol).
 * Port of dikshank-backend VehicleGpsListenerManager without the Redis command bridge
 * (gps-house has no GPS command module yet), so commands only go out from the gps-worker.
 */
@injectable()
export class VehicleGpsListenerManager implements IVehicleGpsListenerManager {
  private listeners: Map<string, IVehicleGpsListener> = new Map();

  async initializeListeners(): Promise<void> {
    if (!isVehicleGpsListenerEnabled()) {
      this.listeners.clear();
      logger.info("Vehicle GPS listener is disabled; listener initialization skipped");
      return;
    }

    try {
      const configs = this.loadListenerConfigs();

      for (const config of configs) {
        if (!config.enabled) {
          logger.info(`GPS listener ${config.name} is disabled, skipping`);
          continue;
        }

        const listener = this.createListener(config);
        this.listeners.set(config.name, listener);

        logger.info(`GPS listener ${config.name} initialized (port: ${config.port}, protocol: ${config.protocol})`);
      }

      logger.info(`Initialized ${this.listeners.size} GPS listener(s)`);
    } catch (error) {
      logger.error("Error initializing GPS listeners:", error);
      throw error;
    }
  }

  async startAllListeners(): Promise<void> {
    if (!isVehicleGpsListenerEnabled()) {
      logger.info("Vehicle GPS listener is disabled; listener startup skipped");
      return;
    }

    const startPromises: Promise<void>[] = [];

    for (const [name, listener] of this.listeners.entries()) {
      startPromises.push(
        listener.start().catch((error) => {
          logger.error(`Failed to start GPS listener ${name}:`, error);
        }),
      );
    }

    await Promise.all(startPromises);
    logger.info(`Started ${this.listeners.size} GPS listener(s)`);
  }

  async stopAllListeners(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [name, listener] of this.listeners.entries()) {
      stopPromises.push(
        listener.stop().catch((error) => {
          logger.error(`Failed to stop GPS listener ${name}:`, error);
        }),
      );
    }

    await Promise.all(stopPromises);
    logger.info(`Stopped ${this.listeners.size} GPS listener(s)`);
  }

  getListener(name: string): IVehicleGpsListener | undefined {
    return this.listeners.get(name);
  }

  getAllListeners(): IVehicleGpsListener[] {
    return Array.from(this.listeners.values());
  }

  getListenerStatus(): Array<{
    name: string;
    running: boolean;
    connections: number;
    deviceImeis: string[];
  }> {
    return Array.from(this.listeners.entries()).map(([name, listener]) => ({
      name,
      running: listener.isRunning(),
      connections: listener.getActiveConnections(),
      deviceImeis: listener.listConnectedDeviceImeis(),
    }));
  }

  isDeviceConnected(deviceImei: string): boolean {
    return this.getAllListeners().some((listener) => listener.isDeviceConnected(deviceImei));
  }

  listConnectedDeviceImeis(): string[] {
    const imeis = new Set<string>();
    for (const listener of this.getAllListeners()) {
      for (const imei of listener.listConnectedDeviceImeis()) {
        imeis.add(imei);
      }
    }
    return [...imeis];
  }

  async sendCommand(deviceImei: string, commandText: string): Promise<GpsCommandSendResult> {
    for (const listener of this.getAllListeners()) {
      if (listener.isDeviceConnected(deviceImei)) {
        return listener.sendCommand(deviceImei, commandText);
      }
    }
    const connected = this.listConnectedDeviceImeis();
    const sample = connected.slice(0, 5).join(", ");
    return {
      ok: false,
      error: `Device offline (no active TCP session on GPS listener; ${connected.length} device(s) currently connected${sample ? `: ${sample}` : ""}).`,
    };
  }

  private loadListenerConfigs(): GpsListenerConfig[] {
    const parsed = parseGpsListenersFromEnv();
    if (parsed.length === 0) {
      logger.warn("No GPS listeners configured in GPS_LISTENERS");
      return [];
    }

    const maxConnections = parseInt(process.env.GPS_LISTENER_MAX_CONNECTIONS || "1000", 10);
    const listenerEnabled = process.env.GPS_LISTENER_ENABLED !== "false";

    return parsed.map((item) => ({
      name: item.key,
      port: item.port,
      protocol: item.protocol,
      enabled: listenerEnabled,
      maxConnections,
    }));
  }

  private createListener(config: GpsListenerConfig): IVehicleGpsListener {
    const gpsQueue = container.resolve<IVehicleGpsQueue>("IVehicleGpsQueue");
    const deviceResolver = container.resolve<IVehicleGpsDeviceResolver>("IVehicleGpsDeviceResolver");
    return new VehicleGpsListener(config, gpsQueue, deviceResolver);
  }
}
