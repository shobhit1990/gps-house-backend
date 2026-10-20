import dotenv from "dotenv";
import { logger } from "./configs/logger";
import { initializeApp } from "./infrastructure/di/initialize";

dotenv.config();

async function startServer() {
  try {
    await initializeApp();

    const PORT = Number(process.env.PORT) || 3000;
    const { default: app } = await import("./app");

    const server = app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    async function shutdown() {
      try {
        logger.info("Shutting down gracefully...");
        server.close(() => {
          logger.info("HTTP server closed");
        });
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    }

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
