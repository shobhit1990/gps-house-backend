import { EntityManager } from "@mikro-orm/mysql";
import { NextFunction, Request, Response } from "express";
import jwt, { JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import { container } from "tsyringe";
import { CustomRequest } from "../../domain/models/CustomRequest";
import { User } from "../../domain/entities/mysql/User";
import { Status } from "../../domain/enums/status";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";

export const authenticateUser = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      throw new AppError("Authentication is required", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("JWT_SECRET is not configured", 500);
    }

    let claims: string | JwtPayload;
    try {
      claims = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    } catch (error: unknown) {
      if (error instanceof JsonWebTokenError) {
        throw new AppError("Invalid or expired access token", 401);
      }
      throw error;
    }
    if (
      typeof claims === "string" ||
      typeof claims.sub !== "string" ||
      typeof claims.sessionVersion !== "number"
    ) {
      throw new AppError("Invalid access token", 401);
    }

    const em = container.resolve<EntityManager>(EntityManager).fork();
    const user = await em.findOne(User, {
      externalId: claims.sub,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!user || claims.sessionVersion !== user.sessionVersion) {
      throw new AppError("Invalid or inactive account", 401);
    }

    (req as CustomRequest).userId = user.id;
    next();
  },
);
