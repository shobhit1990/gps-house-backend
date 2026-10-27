import { Transform } from "class-transformer";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toProperCase(value: string): string {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.replace(/(^|[\s'-])([a-z])/g, (_m, separator: string, char: string) => {
    return `${separator}${char.toUpperCase()}`;
  });
}

export const ToProperCase = () =>
  Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeWhitespace(value);
    return normalized === "" ? normalized : toProperCase(normalized);
  });

export const ToLowerCase = () =>
  Transform(({ value }) => (typeof value === "string" ? normalizeWhitespace(value).toLowerCase() : value));
