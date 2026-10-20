import { Request, Response, NextFunction } from "express";
import { container } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";

export const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

const HEADERS_TOKEN = "RequestHeaders";

export const injectHeaders = (req: Request, res: Response, next: NextFunction) => {
  const headers = req.headers;
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  headers["x-correlation-id"] = correlationId;

  setCorrelationId(correlationId.toString());

  asyncLocalStorage.run(new Map([["correlationId", correlationId.toString()]]), () => {
    container.register(HEADERS_TOKEN, { useValue: headers });
    next();
  });
};

export const getCorrelationId = (): string | undefined => {
  const store = asyncLocalStorage.getStore();
  return store?.get("correlationId");
};

export const setCorrelationId = (correlationId: string) => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.set("correlationId", correlationId);
  }
};
