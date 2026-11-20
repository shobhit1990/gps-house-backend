import * as net from "net";
import { IVehicleGpsListener, GpsListenerConfig } from "./interfaces/IVehicleGpsListener";
import { GpsCommandSendResult } from "./interfaces/IVehicleGpsListenerManager";
import { IVehicleGpsQueue } from "./interfaces/IVehicleGpsQueue";
import { IVehicleGpsDeviceResolver } from "./interfaces/IVehicleGpsDeviceResolver";
import {
  GpsLocationData,
  GpsStatusData,
} from "../domain/models/GpsTrackingData";
import { logger } from "../configs/logger";
import { buildGt800CommandPacket } from "../utils/gpsCommandPacket";
import { decodeGt06LoginImei, gpsImeiLookupVariants, canonicalGpsImei } from "../utils/gpsImei";
import { isNoLocationReply, parseGpsLocationReply } from "../utils/gpsLocationReply";

interface ClientSocket extends net.Socket {
  deviceImei?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  connectedAt?: Date;
  /** Last time a valid location (0x22/0x16/0x26 or location-query reply) arrived on this session (ms). */
  lastLocationAt?: number;
  /** Last time the stale-location poll command was sent on this session (ms). */
  lastLocationPollAt?: number;
  /** Last ignition state seen from status/location packets on this session. */
  lastIgnition?: boolean;
}

/**
 * Heartbeats (0x13) keep the session/time fresh but carry no coordinates. If a device stops
 * uploading location (e.g. after the listener restarts while the vehicle is parked), the map
 * would show a fresh time on an old position — so poll stale devices with a location query.
 */
const LOCATION_POLL_ENABLED = process.env.GPS_LOCATION_POLL_ENABLED !== "false";
const LOCATION_POLL_CHECK_INTERVAL_MS = Number(process.env.GPS_LOCATION_POLL_CHECK_INTERVAL_MS) || 60_000;
const LOCATION_STALE_MS = Number(process.env.GPS_LOCATION_STALE_MS) || 120_000;
const LOCATION_POLL_COMMAND = process.env.GPS_LOCATION_POLL_COMMAND || "WHERE#";
/** A location-query reply arriving within this window of our poll is treated as the poll's answer. */
const LOCATION_POLL_REPLY_WINDOW_MS = 60_000;

export class VehicleGpsListener implements IVehicleGpsListener {
  private server: net.Server | null = null;
  private clients: Map<string, ClientSocket> = new Map();
  private isRunningFlag = false;
  private nextCommandSerial = 1;
  private locationPollTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: GpsListenerConfig,
    private readonly vehicleGpsQueue: IVehicleGpsQueue,
    private readonly vehicleGpsDeviceResolver: IVehicleGpsDeviceResolver,
  ) {}

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      logger.warn(`GPS listener ${this.config.name} is already running`);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = net.createServer((socket: ClientSocket) => {
          this.handleConnection(socket);
        });

        this.server.on("error", (error) => {
          logger.error(`GPS listener ${this.config.name} error:`, error);
          reject(error);
        });

        this.server.listen(this.config.port, () => {
          this.isRunningFlag = true;
          logger.info(`GPS listener ${this.config.name} started on port ${this.config.port} (protocol: ${this.config.protocol})`);
          this.startLocationPoll();
          resolve();
        });
      } catch (error) {
        logger.error(`Failed to start GPS listener ${this.config.name}:`, error);
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    this.stopLocationPoll();

    return new Promise((resolve) => {
      // Close all client connections
      for (const [imei, socket] of this.clients.entries()) {
        socket.destroy();
        logger.debug(`Closed connection for device ${imei} on listener ${this.config.name}`);
      }
      this.clients.clear();

      if (this.server) {
        this.server.close(() => {
          this.isRunningFlag = false;
          logger.info(`GPS listener ${this.config.name} stopped`);
          resolve();
        });
      } else {
        this.isRunningFlag = false;
        resolve();
      }
    });
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  getConfig(): GpsListenerConfig {
    return { ...this.config };
  }

  getActiveConnections(): number {
    this.pruneDeadClients();
    return new Set(
      [...this.clients.values()].filter((socket) => !socket.destroyed && socket.writable),
    ).size;
  }

  listConnectedDeviceImeis(): string[] {
    this.pruneDeadClients();
    const imeis = new Set<string>();
    for (const socket of new Set(this.clients.values())) {
      if (!socket.destroyed && socket.writable && socket.deviceImei) {
        imeis.add(socket.deviceImei);
      }
    }
    return [...imeis];
  }

  isDeviceConnected(deviceImei: string): boolean {
    return Boolean(this.findClientSocket(deviceImei));
  }

  sendCommand(deviceImei: string, commandText: string): GpsCommandSendResult {
    const socket = this.findClientSocket(deviceImei);
    if (!socket) {
      return { ok: false, error: "Device offline" };
    }

    try {
      const serialNumber = this.allocateCommandSerial();
      const packet = buildGt800CommandPacket(commandText, serialNumber);
      const sentPacketHex = packet.toString("hex").toUpperCase();
      socket.write(packet);
      logger.info(
        `Command sent to device ${socket.deviceImei || deviceImei} on ${this.config.name}: ${commandText} hex=${sentPacketHex}`,
      );
      return { ok: true, serialNumber, sentPacketHex };
    } catch (error) {
      logger.error(`Failed to send command to device ${deviceImei}:`, error);
      this.unregisterSocket(socket);
      return { ok: false, error: error instanceof Error ? error.message : "Failed to send command" };
    }
  }

  private startLocationPoll(): void {
    if (!LOCATION_POLL_ENABLED || this.locationPollTimer) return;
    this.locationPollTimer = setInterval(() => this.pollStaleDeviceLocations(), LOCATION_POLL_CHECK_INTERVAL_MS);
    this.locationPollTimer.unref();
    logger.info(
      `GPS listener ${this.config.name} location poll enabled (check=${LOCATION_POLL_CHECK_INTERVAL_MS}ms, stale=${LOCATION_STALE_MS}ms, command=${LOCATION_POLL_COMMAND})`,
    );
  }

  private stopLocationPoll(): void {
    if (this.locationPollTimer) {
      clearInterval(this.locationPollTimer);
      this.locationPollTimer = null;
    }
  }

  /** Send a location query to every connected device that has not reported a location recently. */
  private pollStaleDeviceLocations(): void {
    this.pruneDeadClients();
    const now = Date.now();
    let polled = 0;
    for (const socket of new Set(this.clients.values())) {
      if (!socket.deviceImei || socket.destroyed || !socket.writable) continue;
      const lastLocationAt = socket.lastLocationAt ?? socket.connectedAt?.getTime() ?? now;
      if (now - lastLocationAt < LOCATION_STALE_MS) continue;
      if (now - (socket.lastLocationPollAt ?? 0) < LOCATION_STALE_MS) continue;

      socket.lastLocationPollAt = now;
      const result = this.sendCommand(socket.deviceImei, LOCATION_POLL_COMMAND);
      if (result.ok) polled += 1;
    }
    if (polled > 0) {
      logger.info(`GPS listener ${this.config.name} sent location poll to ${polled} stale device(s)`);
    }
  }

  private allocateCommandSerial(): string {
    const serial = this.nextCommandSerial;
    this.nextCommandSerial = this.nextCommandSerial >= 0xffff ? 1 : this.nextCommandSerial + 1;
    return serial.toString(16).toUpperCase().padStart(4, "0");
  }

  private findClientSocket(deviceImei: string): ClientSocket | null {
    for (const variant of gpsImeiLookupVariants(deviceImei)) {
      const socket = this.clients.get(variant);
      if (socket && !socket.destroyed && socket.writable) {
        return socket;
      }
      if (socket) {
        this.clients.delete(variant);
      }
    }

    // Fallback: scan live sockets in case map keys drifted from DB IMEI formatting.
    const wanted = new Set(gpsImeiLookupVariants(deviceImei));
    if (wanted.size === 0) return null;
    for (const socket of new Set(this.clients.values())) {
      if (socket.destroyed || !socket.writable || !socket.deviceImei) continue;
      if (gpsImeiLookupVariants(socket.deviceImei).some((variant) => wanted.has(variant))) {
        this.registerSocket(socket.deviceImei, socket);
        return socket;
      }
    }
    return null;
  }

  private pruneDeadClients(): void {
    for (const [imei, socket] of this.clients.entries()) {
      if (socket.destroyed || !socket.writable) {
        this.clients.delete(imei);
      }
    }
  }

  private registerSocket(imei: string, socket: ClientSocket): void {
    const variants = gpsImeiLookupVariants(imei);
    const keys = variants.length > 0 ? variants : [imei];
    for (const key of keys) {
      const existing = this.clients.get(key);
      if (existing && existing !== socket) {
        try {
          existing.destroy();
        } catch {
          // Ignore destroy errors on stale sockets.
        }
      }
      this.clients.set(key, socket);
    }
  }

  private unregisterSocket(socket: ClientSocket): void {
    for (const [imei, mapped] of this.clients.entries()) {
      if (mapped === socket) {
        this.clients.delete(imei);
      }
    }
  }

  private handleConnection(socket: ClientSocket): void {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.connectedAt = new Date();

    logger.info(`New connection on ${this.config.name} from ${clientId}`);

    socket.on("data", (data: Buffer) => {
      this.handleData(socket, data);
    });

    socket.on("end", () => {
      this.handleDisconnect(socket);
    });

    socket.on("error", (error) => {
      logger.error(`Socket error on ${this.config.name} for ${socket.deviceImei || clientId}:`, error);
      this.handleDisconnect(socket);
    });

    socket.on("close", () => {
      this.handleDisconnect(socket);
    });
  }

  private handleDisconnect(socket: ClientSocket): void {
    if (!socket.deviceImei) {
      return;
    }
    const wasRegistered = [...this.clients.values()].includes(socket);
    this.unregisterSocket(socket);
    if (wasRegistered) {
      logger.info(`Device ${socket.deviceImei} disconnected from ${this.config.name}`);
    }
  }

  private handleData(socket: ClientSocket, data: Buffer): void {
    try {
      if (this.config.protocol === "GT800N" || this.config.protocol === "GT801N") {
        this.handleGT800NProtocol(socket, data);
      } else {
        logger.warn(`Unsupported protocol ${this.config.protocol} for listener ${this.config.name}`);
      }
    } catch (error) {
      logger.error(`Error handling data on ${this.config.name}:`, error);
    }
  }

  private handleGT800NProtocol(socket: ClientSocket, data: Buffer): void {
    const asciiString = data.toString("hex").toUpperCase();
    const tmpArray = asciiString.replace(/0D0A/g, "#").split("#");

    for (const tmpString of tmpArray) {
      if (tmpString === "" || (tmpString.substring(0, 4) !== "7878" && tmpString.substring(0, 4) !== "7979")) {
        continue;
      }

      const protocolNumber = tmpString.substring(6, 8);
      logger.info(`Received protocol ${protocolNumber} on ${this.config.name} for device ${socket.deviceImei || "unknown"}`);

      // Keep every live authenticated session registered for command delivery.
      this.touchClientRegistration(socket);

      switch (protocolNumber) {
        case "01":
          this.handleLoginPacket(socket, tmpString).catch((error) => {
            logger.error("Error handling login packet:", error);
          });
          break;
        case "13":
          this.handleStatusPacket(socket, tmpString).catch((error) => {
            logger.error("Error handling status packet:", error);
          });
          break;
        case "16":
          // GPS + LBS location packet
          this.handleLocationPacket(socket, tmpString).catch((error) => {
            logger.error("Error handling location packet:", error);
          });
          break;
        case "22":
          this.handleLocationPacket(socket, tmpString).catch((error) => {
            logger.error("Error handling location packet:", error);
          });
          break;
        case "26":
          // Alarm data packet (contains location + alarm info)
          logger.info(`Alarm protocol 26 received on ${this.config.name} for device ${socket.deviceImei || "unknown"}`);
          this.handleAlarmPacket(socket, tmpString).catch((error) => {
            logger.error("Error handling alarm packet:", error);
          });
          break;
        case "49":
          this.handleCommandResponsePacket(socket, tmpString);
          break;
        case "21":
        case "15":
          this.handleCommandResponsePacket(socket, tmpString);
          break;
        default:
          // For all other protocols, call updateResponse equivalent
          this.handleDefaultProtocol(socket, tmpString, protocolNumber);
          break;
      }
    }
  }

  /** Keep TCP client map in sync for every live authenticated session (login + heartbeat/location). */
  private touchClientRegistration(socket: ClientSocket): void {
    if (!socket.deviceImei || socket.destroyed || !socket.writable) {
      return;
    }
    this.registerSocket(socket.deviceImei, socket);
  }

  private async handleLoginPacket(socket: ClientSocket, packet: string): Promise<void> {
    try {
      const packetImei = decodeGt06LoginImei(packet);
      const serialNumber = packet.substring(32, 36);
      const deviceResolution = await this.vehicleGpsDeviceResolver.resolveDevice(packetImei);

      if (!deviceResolution.registered) {
        logger.warn(`Rejected GPS login for unregistered IMEI ${packetImei} on ${this.config.name}`);
        socket.destroy();
        return;
      }

      if (!deviceResolution.mapped || !deviceResolution.vehicleId || !deviceResolution.vehicleNumber) {
        logger.warn(`Rejected GPS login for IMEI ${packetImei}: vehicle mapping not found`);
        socket.destroy();
        return;
      }

      const canonicalImei =
        canonicalGpsImei(deviceResolution.deviceImei) ||
        packetImei ||
        deviceResolution.deviceImei ||
        "";
      socket.deviceImei = canonicalImei;
      socket.vehicleId = deviceResolution.vehicleId;
      socket.vehicleNumber = deviceResolution.vehicleNumber;

      // Send login response
      const response = this.buildLoginResponse(serialNumber);
      socket.write(response);

      // Register under canonical + packet IMEI variants so command lookup always hits.
      this.registerSocket(canonicalImei, socket);
      for (const variant of gpsImeiLookupVariants(packetImei)) {
        if (variant !== canonicalImei) {
          this.clients.set(variant, socket);
        }
      }
      logger.info(
        `Device ${canonicalImei} logged in on ${this.config.name} for vehicle ${socket.vehicleNumber} (tcp registered, connections=${this.getActiveConnections()})`,
      );
    } catch (error) {
      logger.error("Error handling login packet:", error);
      socket.destroy();
    }
  }

  private async handleStatusPacket(socket: ClientSocket, packet: string): Promise<void> {
    if (!socket.deviceImei) {
      logger.warn("Status packet received from unauthenticated device");
      return;
    }

    try {
      const statusData = this.parseStatusPacket(packet);
      statusData.deviceImei = socket.deviceImei;
      statusData.vehicleId = socket.vehicleId;
      statusData.vehicleNumber = socket.vehicleNumber;
      // Protocol 13 has no device clock — stamp receive time for freshness checks.
      statusData.locationTime = new Date();
      socket.lastIgnition = statusData.ignition === "1";

      await this.vehicleGpsQueue.enqueueStatus(statusData);

      // Send acknowledgment
      const serialNumber = packet.substring(packet.length - 8, packet.length - 4);
      const response = this.buildStatusResponse(serialNumber);
      socket.write(response);
    } catch (error) {
      logger.error("Error handling status packet:", error);
    }
  }

  private async handleLocationPacket(socket: ClientSocket, packet: string): Promise<void> {
    if (!socket.deviceImei) {
      logger.warn("Location packet received from unauthenticated device");
      return;
    }

    try {
      const parseResult = this.parseLocationPacket(packet);
      const locationData = parseResult.locationData;
      const serialNumber = parseResult.serialNumber;
      
      locationData.deviceImei = socket.deviceImei;
      locationData.vehicleId = socket.vehicleId;
      locationData.vehicleNumber = socket.vehicleNumber;

      if (this.hasValidCoordinates(locationData)) {
        socket.lastLocationAt = Date.now();
        socket.lastIgnition = locationData.ignitionStatus;
        await this.vehicleGpsQueue.enqueueLocation(locationData);
        logger.debug(`Location packet processed for device ${socket.deviceImei}: lat=${locationData.latitude}, lon=${locationData.longitude}, speed=${locationData.speed}, ignition=${locationData.ignitionStatus}`);
      } else {
        logger.warn(`Skipping location packet for device ${socket.deviceImei}: invalid coordinates`);
      }

      // Send acknowledgment (always send response, even if location not saved). FT12/GT800 treat
      // an unacknowledged location as blind-area data and reconnect, so the CRC must be valid.
      const response = this.buildLocationResponse(serialNumber, parseInt(packet.substring(6, 8), 16));
      socket.write(response);
    } catch (error) {
      logger.error(`Error handling location packet for device ${socket.deviceImei}:`, error);
    }
  }

  private parseStatusPacket(packet: string): GpsStatusData {
    // Exact match to original GT800N.js protocol 13 parsing
    let index = 8;
    const terminalContent = packet.substring(index, index + 2);
    index += 2;

    const binaryValues = parseInt(terminalContent, 16).toString(2).padStart(8, "0");

    const statusData: GpsStatusData = {
      deviceImei: "",
      terminalInfo: binaryValues,
      oilElectricity: binaryValues[0] === "1",
      gpsTracking: binaryValues.substring(2, 5), // Original uses substring(2, 5) not boolean
      charging: binaryValues[5] === "1",
      ignition: binaryValues[6] === "1" ? "1" : "0", // 0 = off, 1 = on (GPS queue convention)
      defence: "",
    };

    statusData.voltage = packet.substring(index, index + 2);
    index += 2;

    statusData.gsmSignal = packet.substring(index, index + 2);
    index += 2;

    const alarmq = packet.substring(index, index + 4);
    index += 4;
    statusData.alarm = alarmq.substring(0, 2);
    // Original stores AlarmLanguage in alarmq.substring(2, 4) but doesn't use it in status data
    statusData.alarmStatus = alarmq.substring(2, 4);

    return statusData;
  }

  private parseLocationPacket(packet: string): { locationData: GpsLocationData; serialNumber: string } {
    const tDateTime = packet.substring(8, 20);
    const year = parseInt(tDateTime.substring(0, 2), 16);
    const month = parseInt(tDateTime.substring(2, 4), 16);
    const day = parseInt(tDateTime.substring(4, 6), 16);
    const hour = parseInt(tDateTime.substring(6, 8), 16);
    const min = parseInt(tDateTime.substring(8, 10), 16);
    const sec = parseInt(tDateTime.substring(10, 12), 16);

    // Protocol: all device timestamps are uploaded in the zero time zone (UTC).
    const locationTime = new Date(Date.UTC(2000 + year, month - 1, day, hour, min, sec));

    const satellite = parseInt(packet.substring(20, 22).charAt(1), 16);

    const lat = packet.substring(22, 30);
    const lt1 = parseInt(lat, 16);
    const latitude = lt1 / (30000 * 60);

    const lon = packet.substring(30, 38);
    const ln1 = parseInt(lon, 16);
    const longitude = ln1 / (30000 * 60);

    const speed = parseInt(packet.substring(38, 40), 16);

    const direction = packet.substring(40, 44);
    const binaryValues = parseInt(direction, 16).toString(2).padStart(16, "0");
    const directionValue = parseInt(binaryValues.substring(6, 16), 2);

    let index = 44;
    const mcc = parseInt(packet.substring(index, index + 4), 16).toString();
    index += 4;
    const mnc = parseInt(packet.substring(index, index + 2), 16).toString();
    index += 2;
    const lac = parseInt(packet.substring(index, index + 4), 16).toString();
    index += 4;
    const cellId = parseInt(packet.substring(index, index + 6), 16).toString();
    index += 6;

    const accStatusHex = packet.substring(index, index + 2);
    index += 2;
    const dataMode = packet.substring(index, index + 2);
    index += 2;
    const realTimeUpload = packet.substring(index, index + 2);
    index += 2;

    // Serial number sits just before the CRC; read it from the end because some models append
    // optional fields (e.g. 4-byte mileage) before it.
    const serialNumber = packet.substring(packet.length - 8, packet.length - 4);

    const locationData: GpsLocationData = {
      deviceImei: "",
      locationTime,
      latitude,
      longitude,
      speed,
      satellite,
      latitudeType: "N",
      longitudeType: "E",
      direction: directionValue,
      mcc,
      mnc,
      lac,
      cellId,
      ignitionStatus: parseInt(accStatusHex, 16) === 1, // true = on, false = off
      gpsRealTime: realTimeUpload,
      gpsPositioning: dataMode,
    };

    return { locationData, serialNumber };
  }

  private parseAlarmPacket(packet: string): { locationData: GpsLocationData; serialNumber: string; alarmCode: string } {
    const tDateTime = packet.substring(8, 20);
    const year = parseInt(tDateTime.substring(0, 2), 16);
    const month = parseInt(tDateTime.substring(2, 4), 16);
    const day = parseInt(tDateTime.substring(4, 6), 16);
    const hour = parseInt(tDateTime.substring(6, 8), 16);
    const min = parseInt(tDateTime.substring(8, 10), 16);
    const sec = parseInt(tDateTime.substring(10, 12), 16);

    // Protocol: all device timestamps are uploaded in the zero time zone (UTC).
    const locationTime = new Date(Date.UTC(2000 + year, month - 1, day, hour, min, sec));

    const satellite = parseInt(packet.substring(20, 22).charAt(1), 16);

    const lat = packet.substring(22, 30);
    const lt1 = parseInt(lat, 16);
    const latitude = lt1 / (30000 * 60);

    const lon = packet.substring(30, 38);
    const ln1 = parseInt(lon, 16);
    const longitude = ln1 / (30000 * 60);

    const speed = parseInt(packet.substring(38, 40), 16);

    const direction = packet.substring(40, 44);
    const binaryValues = parseInt(direction, 16).toString(2).padStart(16, "0");
    const directionValue = parseInt(binaryValues.substring(6, 16), 2);

    // 0x26 (unlike 0x22) carries a 1-byte "LBS length" before MCC.
    let index = 44 + 2;
    const mcc = parseInt(packet.substring(index, index + 4), 16).toString();
    index += 4;
    const mnc = parseInt(packet.substring(index, index + 2), 16).toString();
    index += 2;
    const lac = parseInt(packet.substring(index, index + 4), 16).toString();
    index += 4;
    const cellId = parseInt(packet.substring(index, index + 6), 16).toString();
    index += 6;

    // Terminal Information byte (hex): convert to binary and decode per protocol
    // Bit7: Oil/electricity (1=disconnected, 0=connected) | Bit6: GPS tracking (1=on, 0=off)
    // Bit5~Bit3: Alarm 000=Normal, 001=Vibration, 010=Power Cut, 011=Low Battery, 100=SOS
    // Bit2: Charging (1=charging, 0=not) | Bit1: ACC (1=high, 0=low) | Bit0: Defence (1=on, 0=off)
    const terminalIdHex = packet.substring(index, index + 2);
    index += 2;
    const terminalIdBinary = parseInt(terminalIdHex, 16).toString(2).padStart(8, "0");
    const b = terminalIdBinary; // b[0]=Bit7 .. b[7]=Bit0

    const alarmBits = b.substring(2, 5); // Bit5~Bit3
    const alarmTypeMap: Record<string, string> = {
      "000": "Normal",
      "001": "Vibration",
      "010": "PowerCut",
      "011": "LowBattery",
      "100": "SOS",
    };

    const terminalIdData = {
      oilElectricityDisconnected: b[0] === "1", // Bit7: 1 = disconnected
      gpsTrackingOn: b[1] === "1", // Bit6: 1 = GPS positioned
      alarmType: alarmTypeMap[alarmBits] ?? "Unknown", // Bit5~Bit3
      charging: b[5] === "1", // Bit2: 1 = charging
      accHigh: b[6] === "1", // Bit1: 1 = ACC high (e.g. ignition on)
      defence: b[7] === "1", // Bit0: 1 = defence activated
    };
    const voltage = packet.substring(index, index + 2);
    index += 2;
    const gsmSignal = packet.substring(index, index + 2);
    index += 2;
    const alarmCode = packet.substring(index, index + 2);
    index += 2;
    const alarmLanguage = packet.substring(index, index + 2);
    index += 2;

    // const accStatus = packet.substring(index, index + 2);
    // index += 2;
    // const dataMode = packet.substring(index, index + 2);
    // index += 2;
    // const realTimeUpload = packet.substring(index, index + 2);
    // index += 2;

    // Serial number sits just before the CRC; read it from the end because some models append
    // optional fields (e.g. 4-byte mileage) before it.
    const serialNumber = packet.substring(packet.length - 8, packet.length - 4);

    const locationData: GpsLocationData = {
      deviceImei: "",
      locationTime,
      latitude,
      longitude,
      speed,
      satellite,
      latitudeType: "N",
      longitudeType: "E",
      direction: directionValue,
      mcc,
      mnc,
      lac,
      cellId,
      ignitionStatus: terminalIdData.accHigh, // ACC high = ignition on (Bit1)
      gpsRealTime: undefined,
      gpsPositioning: undefined,
    };

    return { locationData, serialNumber, alarmCode };
  }

  private async handleAlarmPacket(socket: ClientSocket, packet: string): Promise<void> {
    if (!socket.deviceImei) {
      logger.warn("Alarm packet received from unauthenticated device");
      return;
    }

    try {
      logger.info(`Alarm packet received from device ${socket.deviceImei}: ${packet}`);
      // Protocol 26: Alarm data packet (similar to location packet but with alarm info)
      // Parse location data first (same structure as protocol 22)
      const parseResult = this.parseAlarmPacket(packet);
      const locationData = parseResult.locationData;
      const serialNumber = parseResult.serialNumber;
      
      locationData.deviceImei = socket.deviceImei;
      locationData.vehicleId = socket.vehicleId;
      locationData.vehicleNumber = socket.vehicleNumber;

      // Alarm code is the first byte of the Alarm/Language field.
      const alarmType = parseResult.alarmCode || "00";
      
      // Add alarm info to metadata
      locationData.metadata = {
        ...locationData.metadata,
        alarmType,
        isAlarm: true,
      };

      if (this.hasValidCoordinates(locationData)) {
        socket.lastLocationAt = Date.now();
        socket.lastIgnition = locationData.ignitionStatus;
        await this.vehicleGpsQueue.enqueueLocation(locationData);

        logger.debug(
          `Alarm packet processed for device ${socket.deviceImei}: vehicle=${socket.vehicleNumber || "unknown"}, lat=${locationData.latitude}, lon=${locationData.longitude}, alarmType=${alarmType}, ignition=${locationData.ignitionStatus}`,
        );
      } else {
        logger.warn(`Skipping alarm location for device ${socket.deviceImei}: invalid coordinates`);
      }

      // Send acknowledgment
      const response = this.buildAlarmResponse(serialNumber);
      socket.write(response);
    } catch (error) {
      logger.error(`Error handling alarm packet for device ${socket.deviceImei}:`, error);
    }
  }

  private handleDefaultProtocol(socket: ClientSocket, packet: string, protocolNumber: string): void {
    // For all protocols not explicitly handled, call updateResponse equivalent
    // This matches the default case in original GT800N.js
    if (socket.deviceImei) {
      logger.debug(`Unhandled protocol ${protocolNumber} on ${this.config.name} for device ${socket.deviceImei}`);
      this.handleCommandResponsePacket(socket, packet);
    } else {
      logger.debug(`Unhandled protocol ${protocolNumber} on ${this.config.name} from unauthenticated device`);
    }
  }

  private handleCommandResponsePacket(socket: ClientSocket, packet: string): void {
    if (!socket.deviceImei) {
      logger.warn("Command response packet received from unauthenticated device");
      return;
    }

    try {
      const parsed = this.parseCommandResponsePacket(packet);
      const protocolNumber = packet.length >= 8 ? packet.substring(6, 8) : "15";
      logger.info(
        `Command response received from device ${socket.deviceImei}: ascii=${parsed.responseText || "empty"} raw=${packet}`,
      );

      // Device expects a server ACK for the command-response packet; without it many units
      // drop the TCP session and subsequent commands show as "Device offline".
      this.sendAcknowledgment(socket, packet, protocolNumber);

      // WHERE#/DWXX# style replies carry coordinates — save them as a location.
      // (gps-house has no GPS command-log module, so other replies are only logged above.)
      this.handleLocationQueryReply(socket, parsed.responseText);
    } catch (error) {
      logger.error(`Error handling command response packet for device ${socket.deviceImei}:`, error);
    }
  }

  /**
   * If a command reply carries coordinates (WHERE#/DWXX# style), save it as a location.
   * Stamped with receive time: it is the device's current position, and must not lose to a
   * heartbeat-refreshed locationTime. Returns true when it answered our automatic poll.
   */
  private handleLocationQueryReply(socket: ClientSocket, responseText: string): boolean {
    const now = Date.now();
    const answersOurPoll =
      socket.lastLocationPollAt !== undefined && now - socket.lastLocationPollAt <= LOCATION_POLL_REPLY_WINDOW_MS;

    if (isNoLocationReply(responseText)) {
      // Device has no GPS fix (GPS sleeps with ACC off) — nothing to save; keep last known position.
      logger.debug(`Device ${socket.deviceImei} has no GPS fix: ${responseText}`);
      return answersOurPoll;
    }

    const reply = parseGpsLocationReply(responseText);
    if (!reply || !socket.deviceImei) return false;

    const locationData: GpsLocationData = {
      deviceImei: socket.deviceImei,
      vehicleId: socket.vehicleId,
      vehicleNumber: socket.vehicleNumber,
      locationTime: new Date(now),
      latitude: reply.latitude,
      longitude: reply.longitude,
      speed: reply.speed ?? 0,
      direction: reply.direction,
      latitudeType: reply.latitude < 0 ? "S" : "N",
      longitudeType: reply.longitude < 0 ? "W" : "E",
      ignitionStatus: reply.ignitionStatus ?? socket.lastIgnition,
      metadata: { source: "location-query-reply", responseText },
    };
    socket.lastLocationAt = now;
    void this.vehicleGpsQueue.enqueueLocation(locationData).catch((error) => {
      logger.error(`Failed to enqueue location-query reply for device ${socket.deviceImei}:`, error);
    });
    logger.info(
      `Location-query reply saved for device ${socket.deviceImei}: lat=${reply.latitude}, lon=${reply.longitude}`,
    );

    return answersOurPoll;
  }

  /**
   * GT06/GT800 0x15 terminal reply:
   * 78 78 | len | 15 | cmdLen | serverFlag(4) | ASCII content | language(2) | serial(2) | crc(2)
   * Older code trimmed `length-26` and often left a single garbage char like "T".
   */
  private parseCommandResponsePacket(packet: string): {
    responseText: string;
    serialNumber: string;
    rawHex: string;
  } {
    const rawHex = packet.toUpperCase();
    const serialNumber =
      rawHex.length >= 8 ? rawHex.substring(rawHex.length - 8, rawHex.length - 4) : "0001";

    try {
      const buf = Buffer.from(rawHex, "hex");
      if (buf.length >= 12 && (buf[3] === 0x15 || buf[3] === 0x21 || buf[3] === 0x49)) {
        // content starts after start(2)+len(1)+proto(1)+cmdLen(1)+serverFlag(4) = 9
        // ends before language(2)+serial(2)+crc(2) = 6
        const contentStart = 9;
        const contentEnd = Math.max(contentStart, buf.length - 6);
        const content = buf.subarray(contentStart, contentEnd);
        const responseText = content
          .toString("ascii")
          .replace(/[^\x20-\x7E]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return {
          responseText: responseText || content.toString("hex").toUpperCase(),
          serialNumber,
          rawHex,
        };
      }
    } catch {
      // Fall through to legacy-ish decode.
    }

    let responseText = "";
    if (rawHex.length > 18) {
      const responseHex = rawHex.substring(18, Math.max(18, rawHex.length - 8));
      for (let i = 0; i + 1 < responseHex.length; i += 2) {
        const code = parseInt(responseHex.substring(i, i + 2), 16);
        if (code >= 0x20 && code <= 0x7e) {
          responseText += String.fromCharCode(code);
        }
      }
    }
    return {
      responseText: responseText.trim() || rawHex,
      serialNumber,
      rawHex,
    };
  }


  private buildAlarmResponse(serialNumber: string): Buffer {
    const s1 = parseInt(serialNumber.substring(0, 2), 16);
    const s2 = parseInt(serialNumber.substring(2, 4), 16);
    const dataPacket = [0x05, 0x26, s1, s2];
    const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
    const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

    return Buffer.from([
      0x78, 0x78, 0x05, 0x26, s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
    ]);
  }

  private buildCommandResponseAck(serialNumber: string): Buffer {
    const s1 = parseInt(serialNumber.substring(0, 2), 16);
    const s2 = parseInt(serialNumber.substring(2, 4), 16);
    const dataPacket = [0x05, 0x49, s1, s2];
    const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
    const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

    return Buffer.from([
      0x78, 0x78, 0x05, 0x49, s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
    ]);
  }

  private buildLoginResponse(serialNumber: string): Buffer {
    const s1 = parseInt(serialNumber.substring(0, 2), 16);
    const s2 = parseInt(serialNumber.substring(2, 4), 16);
    const dataPacket = [0x05, 0x01, s1, s2];
    const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
    const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

    return Buffer.from([
      0x78, 0x78, 0x05, 0x01, s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
    ]);
  }

  private buildStatusResponse(serialNumber: string): Buffer {
    const s1 = parseInt(serialNumber.substring(0, 2), 16);
    const s2 = parseInt(serialNumber.substring(2, 4), 16);
    const dataPacket = [0x05, 0x13, s1, s2];
    const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
    const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

    return Buffer.from([
      0x78, 0x78, 0x05, 0x13, s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
    ]);
  }

  private buildLocationResponse(serialNumber: string, protocolNumber = 0x22): Buffer {
    // Response echoes the received protocol number; CRC covers length..serial (protocol doc: 78 78 05 22 C4 C0 4F CC).
    // The legacy code computed the CRC with 0x13, which devices discard as a corrupt packet.
    const s1 = parseInt(serialNumber.substring(0, 2), 16);
    const s2 = parseInt(serialNumber.substring(2, 4), 16);
    const dataPacket = [0x05, protocolNumber, s1, s2];
    const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
    const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

    return Buffer.from([
      0x78, 0x78, 0x05, protocolNumber, s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
    ]);
  }

  private sendAcknowledgment(socket: ClientSocket, packet: string, protocolNumber: string): void {
    try {
      const serialNumber = packet.substring(packet.length - 8, packet.length - 4);
      const s1 = parseInt(serialNumber.substring(0, 2), 16);
      const s2 = parseInt(serialNumber.substring(2, 4), 16);
      const dataPacket = [0x05, parseInt(protocolNumber, 16), s1, s2];
      const crc = this.getCrc16(dataPacket, 0, dataPacket.length);
      const hexCRC = crc.toString(16).toUpperCase().padStart(4, "0");

      const response = Buffer.from([
        0x78, 0x78, 0x05, parseInt(protocolNumber, 16), s1, s2, parseInt(hexCRC.substring(0, 2), 16), parseInt(hexCRC.substring(2, 4), 16), 0x0d, 0x0a,
      ]);

      socket.write(response);
    } catch (error) {
      logger.error("Error sending acknowledgment:", error);
    }
  }

  private getCrc16(data: number[], offset: number, length: number): number {
    const crctab16 = [
      0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf, 0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7,
      0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e, 0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876,
      0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd, 0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5,
      0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c, 0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974,
      0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb, 0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3,
      0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a, 0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72,
      0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9, 0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
      0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738, 0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70,
      0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7, 0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
      0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036, 0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e,
      0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5, 0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd,
      0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226, 0xd0bd, 0xc134, 0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c,
      0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3, 0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb,
      0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232, 0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
      0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1, 0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9,
      0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330, 0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78,
    ];

    let fcs = 0xffff;
    for (let i = offset; i < offset + length; i++) {
      fcs = (fcs >> 8) ^ crctab16[(fcs ^ data[i]) & 0xff];
    }
    return ~fcs & 0xffff;
  }

  private hasValidCoordinates(locationData: GpsLocationData): boolean {
    return (
      Number.isFinite(locationData.latitude) &&
      Number.isFinite(locationData.longitude) &&
      locationData.latitude >= -90 &&
      locationData.latitude <= 90 &&
      locationData.longitude >= -180 &&
      locationData.longitude <= 180
    );
  }
}

