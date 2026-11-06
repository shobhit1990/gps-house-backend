import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import { asyncHandler } from "../../utils/asyncHandler";
import { CustomRequest } from "../../domain/models/CustomRequest";
import { AppError } from "../../utils/errors";
import { container } from "tsyringe";
import { logger } from "../../configs/logger";
import { Status } from "../../domain/enums/status";
import { IUserRepository } from "../../domain/repositories/mysql/IUserRepository";


dotenv.config();

const API_KEY_HEADER_NAME = "x-api-key";
const SIGNATURE_HEADER_NAME = "signature";

interface AuthOptions {
  requireJWT?: boolean;
  requireApiKey?: boolean;
  requireSignature?: boolean;
}

export const authenticate = (options: AuthOptions) => {
  return asyncHandler(
    async (
      req: CustomRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const authHeader = req.headers["authorization"] as string;
      let SECRET = process.env.SECRET_API_KEY || ""; // Retrieve from env for security
      const apiKey = req.headers[API_KEY_HEADER_NAME] as string;
      const signature = req.headers[SIGNATURE_HEADER_NAME] as string;
      let signatureLabel = "API";
      if (options.requireApiKey) {
        if (!apiKey) {
          throw new AppError(
            `${API_KEY_HEADER_NAME} is required in headers`,
            401
          );
        }
      }

      if (options.requireSignature) {
        if (!signature) {
          throw new AppError(
            `${SIGNATURE_HEADER_NAME} is required in headers`,
            401
          );
        }

        const isValid = ValidateSignaturePayload(req, signature, SECRET);

        if (!isValid) {
          throw new AppError(`Invalid ${signatureLabel} signature`, 401);
        }
      }

      if (options.requireJWT) {
        const decoded = validateJwtToken(options, authHeader, req);
        const tokenId = decoded.id != null ? String(decoded.id) : "";
        const userRepository = container.resolve("IUserRepository") as IUserRepository;
        const userDetails = await userRepository.getUserById(tokenId);

        if (!userDetails) {
          logger.warn("Session expire: user not found", { tokenId });
          throw new AppError("Session expire: user not found", 401);
        }

        if (userDetails.status !== Status.ACTIVE) {
          throw new AppError(
            "Your account is inactive. Please contact an administrator.",
            401
          );
        }

        req.userId = userDetails.id;
        req.userExternalId = tokenId;
        req.ExternalId = tokenId;
        req.roleId = userDetails.user_type?.id;
        req.roleCode = userDetails.user_type?.roleCode;
        req.isDealer = Boolean(userDetails.isDealer);
        if (userDetails.isDealer) {
          req.isMobileSession = true;
        }

        bindRequestActor({
          userId: userDetails.id,
          isDealer: Boolean(userDetails.isDealer),
        });
      }

      next();
    }
  );
};

/** Public `/auth/*` routes (web/mobile login, refresh): no JWT, API key, or signature. */
export const auth = authenticate({
  requireSignature: false,
  requireApiKey: false,
  requireJWT: false,
});

function ValidateSignaturePayload(
  req: Request,
  signature: string,
  secret: string
) {
  const hmac = crypto.createHmac("sha256", secret);
  const computedHash = hmac.update(JSON.stringify(req.body)).digest("hex");

  // Use timing-safe comparison to check if hashes match
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedHash)
  );
  return isValid;
}

function validateJwtToken(
  options: AuthOptions,
  authHeader: string | undefined,
  req: Request
): any {
  if (options.requireJWT) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authorization header is required. Format: Bearer <token>",
        401
      );
    }

    const token = authHeader.split(" ")[1];

    // Check if the token is blacklisted
    if (isAccessTokenBlacklisted(token)) {
      throw new AppError("This access token has been revoked.", 401);
    }

    try {
      const decoded = verifyAccessToken(token);
      return decoded;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Token expired") {
          throw new AppError(
            "Access token has expired. Please use the refresh token endpoint to get a new token.",
            401,
            error
          );
        } else if (error.message === "Invalid token") {
          throw new AppError(
            "Invalid access token. Please provide a valid token.",
            401,
            error
          );
        }
      }
      throw new AppError("Invalid or expired token", 401, error);
    }
  }
  return {};
}
