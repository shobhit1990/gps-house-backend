import cors, { CorsOptions } from "cors";
import { Application } from "express";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

function isOriginAllowed(origin: string | undefined, origins: string[]): boolean {
  if (origins.includes("*")) {
    return true;
  }

  if (!origin) {
    return true;
  }

  if (origins.includes(origin)) {
    return true;
  }

  for (const allowedOrigin of origins) {
    if (allowedOrigin.startsWith("*.")) {
      const domain = allowedOrigin.slice(2);
      try {
        const { hostname } = new URL(origin);
        if (hostname.endsWith(`.${domain}`)) {
          return true;
        }
      } catch {
        logger.warn("Invalid Origin header; denying", { origin });
        return false;
      }
    }
  }

  logger.info("Not allowing origin", origin);
  return false;
}

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      logger.info("Not allowing origin", origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-app-code",
    "x-app-version",
    "x-api-key",
    "x-correlation-id",
  ],
  exposedHeaders: ["Authorization"],
};

export function setupCors(app: Application): void {
  if (!process.env.ALLOWED_ORIGINS || !process.env.ALLOWED_ORIGINS.trim()) {
    logger.error(
      "ALLOWED_ORIGINS must be defined (comma-separated). Refusing to start with implicit default.",
    );
    throw new Error("ALLOWED_ORIGINS environment variable is required.");
  }

  app.use(cors(corsOptions));
}
