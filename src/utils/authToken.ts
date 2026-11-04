import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../domain/entities/mysql/User";
import { AppError } from "./errors";

export function createAuthToken(user: User): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }

  return jwt.sign(
    {
      userType: user.userType,
      sessionVersion: user.sessionVersion,
    },
    secret,
    {
      subject: user.externalId,
      expiresIn: "15m",
    },
  );
}

export function createRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
