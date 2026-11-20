import dotenv from "dotenv";
import { logger } from "./configs/logger";
import { initializeApp, stopGpsServices } from "./infrastructure/di/initialize";
import { SocketService } from "./services/SocketService";
import { getRuntimeRole, shouldStartHttpServer } from "./utils/runtimeRole";

dotenv.config();

async function startServer() {
  try {
    registerProcessErrorHandlers();
    await initializeApp();

    const runtimeRole = getRuntimeRole();

    if (!shouldStartHttpServer()) {
      // gps-worker / gps-report-worker: no HTTP server; GPS services were started in initializeApp().
      logger.info(`HTTP server skipped for runtime role: ${runtimeRole}`);
      process.on("SIGTERM", () => void shutdownWorker(runtimeRole));
      process.on("SIGINT", () => void shutdownWorker(runtimeRole));
      return;
    }

    const PORT = Number(process.env.PORT) || 3000;
    const { default: app } = await import("./app");

    const server = app.listen(PORT, "127.0.0.1", () => {
      logger.info(`Server is running on http://127.0.0.1:${PORT} (runtime role: ${runtimeRole})`);
    });

    const socketService = new SocketService();
    socketService.start(server);
    logger.info("Socket.IO server initialized");

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    async function shutdown() {
      try {
        logger.info("Shutting down gracefully...");
        await stopGpsServices();
        await socketService.stop();
        server.close(() => {
          logger.info("HTTP server closed");
        });
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    }
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1);
  }
}

async function shutdownWorker(runtimeRole: string) {
  logger.info(`Shutting down ${runtimeRole} process gracefully...`);
  await stopGpsServices();
  process.exit(0);
}

function registerProcessErrorHandlers() {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (error) => {
    // A GPS device dropping its TCP session must not take the whole worker down.
    if (isRecoverableNetworkError(error)) {
      logger.error("Recoverable network exception ignored to keep workers alive:", error);
      return;
    }

    console.error("Uncaught Exception:", error);
    process.exit(1);
  });
}

function isRecoverableNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  const syscall = (error as { syscall?: unknown }).syscall;

  return (
    typeof code === "string" &&
    ["EADDRNOTAVAIL", "ECONNRESET", "ETIMEDOUT"].includes(code) &&
    (syscall === undefined || syscall === "read" || syscall === "write")
  );
}

startServer();
