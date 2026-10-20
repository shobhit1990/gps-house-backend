import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application, NextFunction, Request, Response } from "express";

const getDescription = () => `
This API is designed for **${process.env.APP_NAME || "GPS House"}**.

## Authentication

The API uses **Bearer Token (JWT)** authentication. Secured endpoints require:

\`\`\`
Authorization: Bearer <your-access-token>
\`\`\`
`;

const getOptions = () => ({
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${process.env.APP_NAME || "GPS House"} API`,
      version: "1.0.0",
      description: getDescription(),
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: `${process.env.API_URL || "http://localhost:3000"}/api/v1`,
        description: "API server V1",
      },
    ],
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
    ],
  },
  apis: ["./src/swagger/**/*.ts"],
});

export const swaggerDocs = (app: Application, port: number): void => {
  if (process.env.ENABLE_SWAGGER_DOC === "true") {
    app.use(
      ["/api/api-docs", "/api/swagger.json"],
      (req: Request, res: Response, next: NextFunction) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
      },
    );

    const swaggerSpec = swaggerJSDoc(getOptions());
    app.use(
      "/api/api-docs",
      swaggerUi.serve,
      (req: Request, res: Response, next: NextFunction) => {
        const setupOptions = swaggerUi.setup(swaggerSpec, {
          swaggerOptions: {
            url: `/api/swagger.json?v=${Date.now()}`,
          },
        });
        return setupOptions(req, res, next);
      },
    );
  } else {
    app.use("/api/api-docs", (req, res) => {
      res.status(403).json({ message: "Access to API docs is restricted" });
    });
  }

  app.get("/api/swagger.json", (req, res) => {
    if (process.env.ENABLE_SWAGGER_DOC !== "true") {
      res.status(403).send({ message: "Access to swagger.json is restricted" });
    } else {
      const swaggerSpec = swaggerJSDoc(getOptions());
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.send(swaggerSpec);
    }
  });
};
