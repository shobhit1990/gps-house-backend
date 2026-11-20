import { ModifiedType } from "../domain/enums/ModifiedType";
import { Month } from "../domain/enums/Month";
import { AppError } from "./errors";

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export interface VehicleLogMonthRange {
  from: Date;
  to: Date;
}

/** Accepts Month enum (`Mar`), `03`, or the portal picker value `03/2026`. */
export function parseVehicleLogMonth(
  month?: string,
  year?: string,
): VehicleLogMonthRange | undefined {
  const monthText = month?.trim();
  const yearText = year?.trim();
  if (!monthText && !yearText) {
    return undefined;
  }
  if (!monthText) {
    throw new AppError("month is required when year is provided", 400);
  }

  const slash = monthText.match(/^(\d{1,2}|[A-Za-z]+)\s*\/\s*(\d{4})$/);
  if (slash) {
    const parsedYear = Number(slash[2]);
    assertYearAgreement(parsedYear, yearText);
    return monthRange(parsedYear, resolveMonthNumber(slash[1]));
  }

  const named = monthText.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const parsedYear = Number(named[2]);
    assertYearAgreement(parsedYear, yearText);
    return monthRange(parsedYear, resolveMonthNumber(named[1]));
  }

  if (!yearText) {
    throw new AppError(
      "year is required. Send month as 03/2026, or month=Mar and year=2026",
      400,
    );
  }

  return monthRange(parseYear(yearText), resolveMonthNumber(monthText));
}

export function parseModifiedType(value?: string): ModifiedType | undefined {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }

  const values = Object.values(ModifiedType);
  const byValue = values.find(
    (item) => item.toLowerCase() === text.toLowerCase(),
  );
  if (byValue) {
    return byValue;
  }

  const byKey = (Object.keys(ModifiedType) as Array<keyof typeof ModifiedType>).find(
    (key) => key.toLowerCase() === text.toLowerCase(),
  );
  if (byKey) {
    return ModifiedType[byKey];
  }

  throw new AppError(
    `modifiedType must be one of: ${values.join(", ")}`,
    400,
  );
}

function assertYearAgreement(parsedYear: number, yearText?: string): void {
  if (!yearText) {
    return;
  }
  if (parseYear(yearText) !== parsedYear) {
    throw new AppError("year does not match the year in month", 400);
  }
}

function parseYear(yearText: string): number {
  if (!/^\d{4}$/.test(yearText)) {
    throw new AppError("year must be a 4-digit year", 400);
  }
  const year = Number(yearText);
  if (year < 2000 || year > 2100) {
    throw new AppError("year is out of range", 400);
  }
  return year;
}

function resolveMonthNumber(token: string): number {
  if (/^\d{1,2}$/.test(token)) {
    const month = Number(token);
    if (month < 1 || month > 12) {
      throw new AppError("month must be between 01 and 12", 400);
    }
    return month;
  }

  const fromEnum = Object.values(Month).find(
    (item) => item.toLowerCase() === token.toLowerCase(),
  );
  const index = MONTH_INDEX[(fromEnum ?? token).toLowerCase()];
  if (index === undefined) {
    throw new AppError(
      `month must be 01-12, MM/YYYY, or one of: ${Object.values(Month).join(", ")}`,
      400,
    );
  }
  return index + 1;
}

function monthRange(year: number, month: number): VehicleLogMonthRange {
  parseYear(String(year));
  if (month < 1 || month > 12) {
    throw new AppError("month must be between 01 and 12", 400);
  }
  return {
    from: new Date(year, month - 1, 1, 0, 0, 0, 0),
    to: new Date(year, month, 1, 0, 0, 0, 0),
  };
}
