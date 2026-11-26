import { createHash, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { User } from "../domain/entities/mysql/User";
import { AppError } from "./errors";

const DEFAULT_ACCESS_TOKEN_EXPIRY = "30m";
const DEFAULT_REFRESH_TOKEN_EXPIRY = "7d";

const DURATION_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function parseDurationToMs(raw: string, envName: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(raw.trim());
  if (!match) {
    throw new AppError(
      `${envName} must be a duration like 30m, 7d, or 1h`,
      500,
    );
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * DURATION_MS[unit];
}

function getAccessTokenExpiry(): SignOptions["expiresIn"] {
  const raw = process.env.JWT_TOKEN_EXPIRY?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRY;
  parseDurationToMs(raw, "JWT_TOKEN_EXPIRY");
  return raw as SignOptions["expiresIn"];
}

export function getRefreshTokenExpiresAt(from = new Date()): Date {
  const raw =
    process.env.JWT_REFRESH_EXPIRY?.trim() || DEFAULT_REFRESH_TOKEN_EXPIRY;
  const ms = parseDurationToMs(raw, "JWT_REFRESH_EXPIRY");
  return new Date(from.getTime() + ms);
}

export function createAuthToken(user: User): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }

  return jwt.sign(
    {
      userType: user.userType?.roleCode,
      roleId: user.userType?.id,
      roleCode: user.userType?.roleCode,
      sessionVersion: user.sessionVersion,
    },
    secret,
    {
      subject: user.externalId,
      expiresIn: getAccessTokenExpiry(),
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
