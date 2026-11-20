import { Server as HttpServer } from "http";
import { Redis } from "ioredis";
import jwt, { JwtPayload } from "jsonwebtoken";
import { EntityManager } from "@mikro-orm/mysql";
import { Server as SocketIOServer, Socket } from "socket.io";
import { container } from "tsyringe";
import { logger } from "../configs/logger";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { setSocketServer } from "../infrastructure/socket/socketServer";
import {
  SocketEvents,
  SocketRedisChannels,
  SocketRooms,
  VehicleLocationUpdatedPayload,
} from "../infrastructure/socket/socketEvents";
import { socketRoom, socketRedisChannel } from "../utils/clientNamespace";
import { IRedisService } from "./interfaces/IRedisService";

/**
 * Socket.IO server for the API process (same flow as dikshank-backend):
 * clients join `vehicle-live-tracking`, GPS workers publish location updates to Redis,
 * and this process relays them to the room.
 */
export class SocketService {
  private io: SocketIOServer | null = null;
  private vehicleLocationSubscriber: Redis | null = null;
  private readonly vehicleLocationChannel = socketRedisChannel(
    SocketRedisChannels.VEHICLE_LOCATION_UPDATED,
  );

  start(server: HttpServer): SocketIOServer {
    if (this.io) {
      return this.io;
    }

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
    const io = new SocketIOServer(server, {
      cors: {
        origin:
          !allowedOrigins || allowedOrigins === "*"
            ? "*"
            : allowedOrigins.split(",").map((origin) => origin.trim()),
        methods: ["GET", "POST"],
      },
    });

    this.io = io;
    setSocketServer(io);
    void this.startVehicleLocationSubscriber();

    io.engine.on("connection_error", (err) => {
      logger.error("Socket.IO connection error", {
        code: err.code,
        message: err.message,
      });
    });

    io.use((socket, next) => {
      void this.authenticateSocketHandshake(socket, next);
    });

    io.on("connection", (socket) => {
      logger.info("Socket client connected", {
        socketId: socket.id,
        transport: socket.conn.transport.name,
      });

      socket.on("join-vehicle-live-tracking", () => {
        void socket.join(socketRoom(SocketRooms.VEHICLE_LIVE_TRACKING));
        logger.info("Socket joined vehicle live tracking room", { socketId: socket.id });
      });

      socket.on("leave-vehicle-live-tracking", () => {
        void socket.leave(socketRoom(SocketRooms.VEHICLE_LIVE_TRACKING));
        logger.info("Socket left vehicle live tracking room", { socketId: socket.id });
      });

      socket.on("disconnect", (reason) => {
        logger.info("Socket client disconnected", { socketId: socket.id, reason });
      });
    });

    logger.info("Socket.IO server ready — waiting for client connections");
    return io;
  }

  async stop(): Promise<void> {
    if (!this.io) return;
    const io = this.io;
    this.io = null;
    setSocketServer(null);
    await this.stopVehicleLocationSubscriber();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }

  /** Same JWT rules as the REST `authenticateUser` middleware. */
  private async authenticateSocketHandshake(
    socket: Socket,
    next: (err?: Error) => void,
  ): Promise<void> {
    try {
      const token = readHandshakeToken(socket);
      if (!token) {
        next(new Error("Authentication is required"));
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        next(new Error("JWT_SECRET is not configured"));
        return;
      }

      let claims: string | JwtPayload;
      try {
        claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch {
        next(new Error("Invalid or expired access token"));
        return;
      }
      if (
        typeof claims === "string" ||
        typeof claims.sub !== "string" ||
        typeof claims.sessionVersion !== "number"
      ) {
        next(new Error("Invalid access token"));
        return;
      }

      const em = container.resolve<EntityManager>(EntityManager).fork();
      const user = await em.findOne(User, {
        externalId: claims.sub,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!user || claims.sessionVersion !== user.sessionVersion) {
        next(new Error("Invalid or inactive account"));
        return;
      }

      socket.data.userId = user.id;
      socket.data.userExternalId = user.externalId;
      next();
    } catch (error) {
      logger.error("Socket handshake authentication failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      next(new Error("Authentication failed"));
    }
  }

  /** Relays gps-worker location publishes to connected live-tracking clients. */
  private async startVehicleLocationSubscriber(): Promise<void> {
    if (this.vehicleLocationSubscriber) return;
    try {
      const redisService = container.resolve<IRedisService>("IRedisService");
      const subscriber = redisService.getClient().duplicate();
      this.vehicleLocationSubscriber = subscriber;

      subscriber.on("error", (error) => {
        logger.error("Vehicle location socket Redis subscriber error", {
          error: error instanceof Error ? error.message : String(error),
        });
      });

      subscriber.on("message", (channel, message) => {
        if (channel !== this.vehicleLocationChannel) return;
        this.emitVehicleLocationFromRedis(message);
      });

      if (subscriber.status === "wait") {
        await subscriber.connect();
      }
      await subscriber.subscribe(this.vehicleLocationChannel);
      logger.info("Vehicle location socket Redis subscriber started");
    } catch (error) {
      this.vehicleLocationSubscriber = null;
      logger.error("Failed to start vehicle location socket Redis subscriber", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async stopVehicleLocationSubscriber(): Promise<void> {
    const subscriber = this.vehicleLocationSubscriber;
    if (!subscriber) return;
    this.vehicleLocationSubscriber = null;
    try {
      await subscriber.unsubscribe(this.vehicleLocationChannel);
      await subscriber.quit();
    } catch (error) {
      logger.error("Failed to stop vehicle location socket Redis subscriber", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private emitVehicleLocationFromRedis(message: string): void {
    try {
      const payload = JSON.parse(message) as VehicleLocationUpdatedPayload;
      if (!payload?.vehicleId && !payload?.deviceImei) return;
      this.io
        ?.to(socketRoom(SocketRooms.VEHICLE_LIVE_TRACKING))
        .emit(SocketEvents.VEHICLE_LOCATION_UPDATED, payload);
    } catch (error) {
      logger.error("Failed to relay vehicle location from Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function readHandshakeToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const fromAuth = typeof auth?.token === "string" ? auth.token : null;
  const header = socket.handshake.headers.authorization;
  const fromHeader = typeof header === "string" ? header : null;
  const query = socket.handshake.query?.token;
  const fromQuery = typeof query === "string" ? query : null;

  const raw = (fromAuth ?? fromHeader ?? fromQuery ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : raw;
}
