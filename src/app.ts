import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import routes from "./interfaces/routes/index";
import { logger } from "./configs/logger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/loggerMiddleware";
import { injectHeaders } from "./middleware/injectHeaders";
import { setupCors } from "./configs/cors";
import { swaggerDocs } from "./configs/swagger";
import { authenticateUser } from "./interfaces/middlewares/userAuthentication";
import { AppError } from "./utils/errors";

dotenv.config();

const app: Application = express();

app.use(requestLogger);
setupCors(app);

app.use(
  express.json({
    limit: "10mb",
    verify: (_req, _res, buf) => {
      if (!buf.length) return;
      try {
        JSON.parse(buf.toString("utf8"));
      } catch {
        logger.error("Invalid JSON payload");
        throw new AppError(
          "Invalid JSON payload. Escape quotes/newlines in body or send via JSON.stringify.",
          400,
        );
      }
    },
  }),
);

app.use(injectHeaders);
app.use(["/uploads", "/upload"], authenticateUser);
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads")),
);
app.use("/upload", express.static(path.join(process.cwd(), "upload")));
app.use("/api", routes);

app.use(errorHandler);
swaggerDocs(app, Number(process.env.PORT) || 3000);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
