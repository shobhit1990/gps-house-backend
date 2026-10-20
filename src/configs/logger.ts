import { createLogger, format, transports } from "winston";
import dotenv from "dotenv";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

const { combine, timestamp, printf, colorize, errors } = format;

dotenv.config();

const getLogDirectory = (): string => {
  const logDirectory = path.resolve(process.cwd(), process.env.LOG_DIR || "logs");
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }
  return logDirectory;
};

const logDirectory = getLogDirectory();
const logFileName = process.env.APP_NAME ? process.env.APP_NAME.toLowerCase() : "app";

const customFormat = printf(({ level, message, timestamp, stack }) => {
  const printableMessage =
    typeof message === "string" ? message : JSON.stringify(message);
  return `${timestamp} ${level}: ${stack || printableMessage}`;
});

const dailyRotateTransport = new DailyRotateFile({
  filename: `${logDirectory}/${logFileName}-%DATE%.log`,
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "10m",
  maxFiles: "7d",
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    customFormat,
  ),
  transports: [new transports.Console({ format: format.simple() }), dailyRotateTransport],
});
