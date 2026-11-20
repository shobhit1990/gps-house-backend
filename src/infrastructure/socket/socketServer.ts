import { Server as SocketIOServer } from "socket.io";
import { container } from "tsyringe";
import { logger } from "../../configs/logger";
import { socketRoom, socketRedisChannel } from "../../utils/clientNamespace";
import { IRedisService } from "../../services/interfaces/IRedisService";
import {
  SocketEvents,
  SocketRedisChannels,
  SocketRooms,
  VehicleLocationUpdatedPayload,
} from "./socketEvents";

let io: SocketIOServer | null = null;

export function setSocketServer(server: SocketIOServer | null): void {
  io = server;
}

/** Emit any event to a specific room — reusable generic emitter. */
export function emitToRoom(room: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(socketRoom(room)).emit(event, payload);
}

/**
 * Broadcast vehicle GPS location update to vehicle-live-tracking room.
 * GPS workers have no Socket.IO server — when `io` is null, publish via Redis so
 * the API process can fan-out to connected web/app clients.
 */
export function emitVehicleLocationUpdate(payload: VehicleLocationUpdatedPayload): void {
  if (io) {
    emitToRoom(SocketRooms.VEHICLE_LIVE_TRACKING, SocketEvents.VEHICLE_LOCATION_UPDATED, payload);
    return;
  }
  void publishVehicleLocationUpdated(payload);
}

async function publishVehicleLocationUpdated(payload: VehicleLocationUpdatedPayload): Promise<void> {
  try {
    const redisService = container.resolve<IRedisService>("IRedisService");
    await redisService
      .getClient()
      .publish(
        socketRedisChannel(SocketRedisChannels.VEHICLE_LOCATION_UPDATED),
        JSON.stringify(payload),
      );
  } catch (error) {
    logger.error("Failed to publish vehicle location socket update", {
      vehicleId: payload.vehicleId,
      deviceImei: payload.deviceImei,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
