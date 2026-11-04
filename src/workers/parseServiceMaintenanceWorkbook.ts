import fs from "fs";
import * as XLSX from "xlsx";

const MAX_WORKSHEET_AREA = 1_000_000;
const MAX_WORKBOOK_RESULT_SIZE = 32 * 1024 * 1024;

try {
  const encodedWorkbook = fs.readFileSync(0, "utf8").trim();
  const workbook = XLSX.read(Buffer.from(encodedWorkbook, "base64"), {
    type: "buffer",
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  const sheetRef = sheet?.["!ref"];
  const cells: Array<[string, unknown]> = [];

  if (sheet && sheetRef) {
    const range = XLSX.utils.decode_range(sheetRef);
    const worksheetArea =
      (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
    if (
      !Number.isSafeInteger(worksheetArea) ||
      worksheetArea > MAX_WORKSHEET_AREA
    ) {
      throw new Error("Worksheet exceeds the supported size");
    }

    let vehicleColumn: number | undefined;
    for (let column = range.s.c; column <= range.e.c; column++) {
      const headerCell = sheet[
        XLSX.utils.encode_cell({ r: range.s.r, c: column })
      ] as XLSX.CellObject | undefined;
      const header = String(headerCell?.v ?? "")
        .trim()
        .toLowerCase();
      if (header === "vehicle" || header === "vehicleexternalid") {
        vehicleColumn = column;
        break;
      }
    }

    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const cell = sheet[address] as XLSX.CellObject;
      const column = XLSX.utils.decode_cell(address).c;
      const value =
        column === vehicleColumn && cell.t === "n"
          ? (cell.w ?? cell.v)
          : cell.v;
      cells.push([address, value]);
    }
  }

  const date1904 = workbook.Workbook?.WBProps?.date1904 ?? false;
  const result = JSON.stringify({ sheetName, sheetRef, date1904, cells });
  if (Buffer.byteLength(result, "utf8") > MAX_WORKBOOK_RESULT_SIZE) {
    throw new Error("Parsed worksheet exceeds the supported size");
  }
  process.stdout.write(result);
} catch (error) {
  process.stderr.write(
    error instanceof Error ? error.message : "Unable to parse workbook",
  );
  process.exitCode = 1;
}
