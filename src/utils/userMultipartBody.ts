import { Request } from "express";
import { AppError } from "./errors";

const JSON_ARRAY_FIELDS = new Set([
  "familyMembers",
  "educationDetails",
  "workExperiences",
]);

const JSON_OBJECT_FIELDS = new Set(["lastEmployerHrDetails"]);

const BOOLEAN_FIELDS = new Set([
  "odometerReadingRequired",
  "sameAsPermanentAddress",
]);

/**
 * Coerces multipart form field values into shapes expected by user DTO validation.
 */
function coerceFormValue(key: string, value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "null" || trimmed === "undefined") {
      return null;
    }

    if (JSON_ARRAY_FIELDS.has(key)) {
      if (trimmed === "") {
        return [];
      }
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }

    if (JSON_OBJECT_FIELDS.has(key)) {
      if (trimmed === "") {
        return null;
      }
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }

    if (BOOLEAN_FIELDS.has(key)) {
      const lower = trimmed.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
    }
  }

  return value;
}

/** True when the request uses multipart/form-data (case-insensitive). */
export function isUserMultipartRequest(req: Request): boolean {
  return String(req.headers["content-type"] || "")
    .toLowerCase()
    .includes("multipart/form-data");
}

/** Builds a plain object body for user create/update from JSON or multipart requests. */
export function normalizeUserRequestBody(req: Request): Record<string, unknown> {
  const isMultipart = isUserMultipartRequest(req);
  const body = { ...(req.body ?? {}) } as Record<string, unknown>;

  if (!isMultipart) {
    return body;
  }

  const bodyKeys = Object.keys(body).filter(
    (k) => body[k] !== undefined && body[k] !== "",
  );
//   const hasFiles = Boolean(
//     req.file ||
//       (Array.isArray(req.files) && req.files.length > 0) ||
//       (req.files && !Array.isArray(req.files) && Object.keys(req.files).length > 0),
//   );
//   if (bodyKeys.length === 0 && !hasFiles) {
//     throw new AppError(
//       "Multipart body was not parsed. Send Content-Type as multipart/form-data with boundary (do not set Content-Type manually when using FormData), and ensure the multer middleware runs before validation.",
//       400,
//     );
//   }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    normalized[key] = coerceFormValue(key, value);
  }
  return normalized;
}

/** Returns the uploaded profile photo file when present (`fieldname` = `photo`). */
// export function extractUserPhotoFile(req: Request): Express.Multer.File | undefined {
//   const files = req.files as Express.Multer.File[] | undefined;
//   if (files?.length) {
//     return files.find((f) => f.fieldname === "photo");
//   }
//   if (req.file?.fieldname === "photo") {
//     return req.file;
//   }
//   return undefined;
// }
