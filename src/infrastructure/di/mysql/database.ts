import mysql from "mysql2/promise";
import { logger } from "../../../configs/logger";

export async function createDatabaseIfNotExists() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_DB_HOST || "localhost",
      user: process.env.MYSQL_DB_USER || "root",
      password: process.env.MYSQL_DB_PASSWORD || "",
      port: parseInt(process.env.MYSQL_DB_PORT || "3306", 10),
    });

    logger.info("Checking for database...");
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DB_NAME}\``);
    logger.info(`Database "${process.env.MYSQL_DB_NAME}" ensured.`);
    await connection.end();
  } catch (error) {
    logger.error("Error creating the database:", error);
    throw error;
  }
}
