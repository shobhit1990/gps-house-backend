import { ValidationError } from "class-validator";
import { FormError } from "../domain/dto/FormError";
import * as crypto from "crypto";
import { instanceToPlain } from "class-transformer";
import { Status } from "../domain/enums/status";

// src/utils/validators.ts
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message: string } => {
  const minLength = 8;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long.` };
  }

  if (!passwordRegex.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    };
  }

  return { valid: true, message: "" };
};

export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/** Property names that usually hold dates/times in API payloads (Mikro date columns often become `{}` via class-transformer). */
const isLikelyDateFieldKey = (key: string): boolean => {
  if (key === "date") return true;
  if (/At$/i.test(key)) return true;
  if (/Date$/i.test(key)) return true;
  if (/Time$/i.test(key)) return true;
  if (/_(at|date|time)$/i.test(key)) return true;
  return false;
};

const dateToIsoOrNull = (d: Date): string | null =>
  Number.isNaN(d.getTime()) ? null : d.toISOString();

const tryCoerceDateLikeToIso = (value: any): string | null => {
  if (value instanceof Date) {
    return dateToIsoOrNull(value);
  }
  if (value != null && typeof value === "object") {
    if (typeof (value as any).toISOString === "function") {
      try {
        return dateToIsoOrNull(value as Date);
      } catch {
        /* ignore */
      }
    }
    if (typeof (value as any).getTime === "function") {
      const t = (value as any).getTime();
      if (typeof t === "number" && !Number.isNaN(t)) {
        return dateToIsoOrNull(new Date(t));
      }
    }
  }
  return null;
};

/**
 * Deep-normalize after `instanceToPlain`: bigint → string, Date → ISO string,
 * broken date fields that became `{}` → null.
 */
export const deepNormalizeApiValue = (value: any, keyHint?: string): any => {
  if (typeof value === "bigint") {
    return value.toString();
  }

  const asIso = tryCoerceDateLikeToIso(value);
  if (asIso !== null) {
    return asIso;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepNormalizeApiValue(item));
  }

  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as object);
    if (
      keys.length === 0 &&
      keyHint !== undefined &&
      isLikelyDateFieldKey(keyHint)
    ) {
      return null;
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepNormalizeApiValue(v, k);
    }
    return out;
  }

  return value;
};

/**
 * Safely transforms entity to plain object, preventing circular references
 * @param entity - The entity to transform
 * @param options - Additional transformation options
 * @returns Plain object representation
 */
export const safeTransform = (entity: any, options: any = {}): any => {
  try {
    const plain = instanceToPlain(entity, {
      // excludeExtraneousValues: true,
      enableCircularCheck: true,
      ...options,
    });
    return deepNormalizeApiValue(plain);
  } catch (error) {
    // Fallback to manual transformation if circular reference detected
    console.warn('Circular reference detected, using fallback transformation:', error);
    return JSON.parse(JSON.stringify(entity, (key, value) => {
      // Remove circular references by excluding certain keys
      if (key === 'saleOrder' || key === 'purchaseOrder' || key === 'items' || key === 'parent' || key === 'children') {
        return undefined;
      }
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
      }
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0 &&
        isLikelyDateFieldKey(key)
      ) {
        return null;
      }
      return value;
    }));
  }
};

export const formatValidationErrors = (errors: ValidationError[]): Array<FormError> => {
  return errors.map((error) => {
    const formError = new FormError();
    formError.field = error.property;

    // Extracting the first constraint message (you can customize this to include more)
    formError.message = Object.values(error.constraints || {})[0] || "Invalid value";

    // If there are nested errors (children), we recursively transform them
    if (error.children && error.children.length > 0) {
      formError.children = formatValidationErrors(error.children);
    }

    return formError;
  });
};

export const isValidMobileCode = (countryCode: string): boolean => {
  const countryCodeRegex = /^\+?[1-9][0-9]{0,2}$/;
  return countryCodeRegex.test(countryCode);
};

export const isValidMobile = (mobile: string): boolean => {
  const mobileRegex = /^[0-9]{7,15}$/;
  return mobileRegex.test(mobile);
};

// utils/objectUtils.ts
export function removeFieldFromObject<T extends object, K extends keyof T>(
  obj: T,
  fieldName: K,
): Omit<T, K> {
  const { [fieldName]: removed, ...rest } = obj;
  return rest;
}

export function formatDateToYYYYMMDD(date: Date | string): string {
  if (!date) return "";

  const d = new Date(date);
  const year = d.getFullYear();
  const month = `0${d.getMonth() + 1}`.slice(-2); // Ensures 2 digits (01-12)
  const day = `0${d.getDate()}`.slice(-2); // Ensures 2 digits (01-31)

  return `${year}-${month}-${day}`;
}

/**
 * Calculate financial year from a given date
 * Financial year runs from April 1 to March 31
 * @param date - The date to calculate financial year from
 * @returns Financial year in format "YYYY-YYYY" (e.g., "2024-2025")
 */
export function getFinancialYear(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed (0 = January, 11 = December)

  // Financial year starts on April 1 (month index 3)
  // If month is 0-2 (Jan-Mar), we're in previous year's financial year
  // If month is 3-11 (Apr-Dec), we're in current year's financial year
  if (month >= 3) {
    // April to December: FY is current year to next year
    return `${year}-${year + 1}`;
  } else {
    // January to March: FY is previous year to current year
    return `${year - 1}-${year}`;
  }
}

export const mergeNestedEntities = (existing: any, incoming: any): void => {
  const validKeys = getEntityKeys(existing); // Extract valid keys from the entity class

  for (const key of Object.keys(incoming)) {
    if (!validKeys.includes(key)) continue; // Skip keys not part of the entity

    const incomingValue = incoming[key];
    if (incomingValue) {
      if (isScalarValue(incomingValue)) {
        // Update only scalar values directly
        if (incomingValue instanceof Date) {
          if (!isNaN(incomingValue.getTime())) existing[key] = incomingValue;
        } else existing[key] = incomingValue;
      }
    }
  }
};

export const getEntityKeys = (entity: any): string[] => {
  return Reflect.ownKeys(entity)
    .map(String)
    .filter((key) => key !== "id");
};

export const isScalarValue = (value: any): boolean => {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined ||
    value instanceof Date // Handle Date objects
  );
};

export const generateSignature = (payload: object, apiKey: string) => {
  const requestBody = JSON.stringify(payload);
  return crypto.createHmac("sha256", apiKey).update(requestBody).digest("hex");
};

export function generateRandomKey(bitLength: number): string {
  const hexLength: number = Math.ceil(bitLength / 4); // Hex characters needed
  const byteLength: number = Math.ceil(hexLength / 2); // Bytes needed

  // Generate random bytes
  const randomValues = new Uint8Array(byteLength);
  crypto.getRandomValues(randomValues);

  // Convert random bytes to a hex string
  const hexString = Array.from(randomValues)
    .map((byte) => byte.toString(16).padStart(2, "0")) // Convert to hex
    .join("");

  // Truncate to the required hex length
  return hexString.slice(0, hexLength);
}


export function getParamAsString(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const val = params[key];
  return Array.isArray(val) ? val[0] ?? "" : (val ?? "");
}

/** Parsed list status for master/list APIs (`all` | `active` | `inactive`). */
export type ParsedListStatusFilter = { kind: "all" } | { kind: "status"; status: Status };

/**
 * Parses `status` query for list endpoints.
 * - `all` or omitted → all non-deleted rows
 * - `active` / `inactive` → filter by Status enum
 */
export function parseListStatusQueryParam(
  raw: unknown,
): ParsedListStatusFilter | "invalid" {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { kind: "all" };
  }

  const value = String(raw).trim().toLowerCase();
  if (value === "all") {
    return { kind: "all" };
  }
  if (value === Status.ACTIVE) {
    return { kind: "status", status: Status.ACTIVE };
  }
  if (value === Status.INACTIVE) {
    return { kind: "status", status: Status.INACTIVE };
  }

  return "invalid";
}