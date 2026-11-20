import "reflect-metadata";
import type { Application } from "express";
import type { Server } from "http";
import dotenv from "dotenv";
import { logger } from "./configs/logger";
import { initializeApp } from "./infrastructure/di/initialize";

dotenv.config();


async function listenWithPortFallback(
  app: Application,
  preferred: number,
  maxAttempts = 20,
): Promise<{ server: Server; port: number }> {
  const start = Number.isFinite(preferred) && preferred >= 1 ? preferred : 3000;
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    try {
      const server = await new Promise<Server>((resolve, reject) => {
        const srv = app.listen(port);
        srv.once("listening", () => resolve(srv));
        srv.once("error", (err: NodeJS.ErrnoException) => reject(err));
      });
      process.env.PORT = String(port);
      if (i > 0) {
        logger.warn(
          `Port ${start} is in use; bound to ${port} instead. Stop the other process or set PORT explicitly.`,
        );
      }
      return { server, port };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "EADDRINUSE") {
        throw err;
      }
    }
  }
  throw new Error(
    `No free TCP port found in range ${start}-${start + maxAttempts - 1}. Free a port or set PORT in .env.`,
  );
}

async function startServer() {
  try {
    await initializeApp();

    const preferredPort = Number(process.env.PORT) || 3000;
    const { default: app } = await import("./app");

    const { server, port } = await listenWithPortFallback(app, preferredPort);
    logger.info(`Server is running on http://localhost:${port}`);

    server.on("error", (err: NodeJS.ErrnoException) => {
      logger.error("HTTP server error", err);
    });

    // Graceful shutdown handling
    process.on("SIGTERM", shutdown); // For PM2 or other process managers
    process.on("SIGINT", shutdown); // For Ctrl+C during development

    async function shutdown() {
      try {
        logger.info("Shutting down gracefully...");
        // Close HTTP server
        server.close(() => {
          logger.info("HTTP server closed");
        });

        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    }

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1); // Exit process after handling the exception
    });
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1); // Exit the process on failure
  }
}

// Start the server
startServer();
