const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;
const MAX_ZIP_UNCOMPRESSED_SIZE = 64 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 100_000;

function readUInt64LE(buffer: Buffer, offset: number): number {
  const value =
    buffer.readUInt32LE(offset) * 0x100000000 + buffer.readUInt32LE(offset + 4);
  if (!Number.isSafeInteger(value)) {
    throw new Error("ZIP archive contains an unsupported size or offset");
  }
  return value;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const firstPossibleOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (
    let offset = buffer.length - 22;
    offset >= firstPossibleOffset;
    offset--
  ) {
    if (
      buffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE &&
      offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length
    ) {
      return offset;
    }
  }
  throw new Error("ZIP archive has an invalid central directory");
}

function readZip64UncompressedSize(
  buffer: Buffer,
  extraOffset: number,
  extraLength: number,
  uncompressedSizeIsZip64: boolean,
  compressedSizeIsZip64: boolean,
): number | undefined {
  const end = extraOffset + extraLength;
  for (let offset = extraOffset; offset + 4 <= end; ) {
    const fieldId = buffer.readUInt16LE(offset);
    const fieldLength = buffer.readUInt16LE(offset + 2);
    const fieldStart = offset + 4;
    const fieldEnd = fieldStart + fieldLength;
    if (fieldEnd > end) {
      throw new Error("ZIP archive has an invalid extra field");
    }
    if (fieldId === 0x0001) {
      const requiredLength =
        (uncompressedSizeIsZip64 ? 8 : 0) + (compressedSizeIsZip64 ? 8 : 0);
      if (fieldLength < requiredLength) {
        throw new Error("ZIP archive has an invalid ZIP64 entry size");
      }
      return uncompressedSizeIsZip64
        ? readUInt64LE(buffer, fieldStart)
        : undefined;
    }
    offset = fieldEnd;
  }
  throw new Error("ZIP archive has an invalid ZIP64 entry size");
}

export function isZipArchive(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 && buffer.readUInt32LE(0) === ZIP_LOCAL_FILE_SIGNATURE
  );
}

export function assertZipUncompressedSizeWithinLimit(buffer: Buffer): void {
  const endOffset = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  let entryCount = buffer.readUInt16LE(endOffset + 10);
  let centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  let centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0) {
    throw new Error("Multi-disk ZIP archives are not supported");
  }
  if (
    entriesOnDisk !== entryCount &&
    !(entriesOnDisk === 0xffff && entryCount === 0xffff)
  ) {
    throw new Error("Multi-disk ZIP archives are not supported");
  }

  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    const locatorOffset = endOffset - 20;
    if (
      locatorOffset < 0 ||
      buffer.readUInt32LE(locatorOffset) !==
        ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE ||
      buffer.readUInt32LE(locatorOffset + 4) !== 0 ||
      buffer.readUInt32LE(locatorOffset + 16) !== 1
    ) {
      throw new Error("ZIP archive has an invalid ZIP64 directory");
    }

    const zip64Offset = readUInt64LE(buffer, locatorOffset + 8);
    if (
      zip64Offset + 56 > locatorOffset ||
      buffer.readUInt32LE(zip64Offset) !==
        ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      throw new Error("ZIP archive has an invalid ZIP64 directory");
    }

    entryCount = readUInt64LE(buffer, zip64Offset + 32);
    if (readUInt64LE(buffer, zip64Offset + 24) !== entryCount) {
      throw new Error("Multi-disk ZIP archives are not supported");
    }
    centralDirectorySize = readUInt64LE(buffer, zip64Offset + 40);
    centralDirectoryOffset = readUInt64LE(buffer, zip64Offset + 48);
  }

  if (
    entryCount > MAX_ZIP_ENTRIES ||
    centralDirectoryOffset + centralDirectorySize > endOffset
  ) {
    throw new Error("ZIP archive has an invalid central directory");
  }

  let uncompressedSize = 0;
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  for (let entry = 0; entry < entryCount; entry++) {
    if (
      offset + 46 > centralDirectoryEnd ||
      buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      throw new Error("ZIP archive has an invalid central directory entry");
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    let entryUncompressedSize = buffer.readUInt32LE(offset + 24);
    const diskStart = buffer.readUInt16LE(offset + 34);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const entryLength = 46 + fileNameLength + extraLength + commentLength;
    if (offset + entryLength > centralDirectoryEnd) {
      throw new Error("ZIP archive has an invalid central directory entry");
    }
    if (diskStart !== 0) {
      throw new Error("Multi-disk ZIP archives are not supported");
    }

    if (entryUncompressedSize === 0xffffffff || compressedSize === 0xffffffff) {
      const zip64UncompressedSize = readZip64UncompressedSize(
        buffer,
        offset + 46 + fileNameLength,
        extraLength,
        entryUncompressedSize === 0xffffffff,
        compressedSize === 0xffffffff,
      );
      if (zip64UncompressedSize !== undefined) {
        entryUncompressedSize = zip64UncompressedSize;
      }
    }

    uncompressedSize += entryUncompressedSize;
    if (
      !Number.isSafeInteger(uncompressedSize) ||
      uncompressedSize > MAX_ZIP_UNCOMPRESSED_SIZE
    ) {
      throw new Error("ZIP archive exceeds the 64 MiB uncompressed size limit");
    }

    offset += entryLength;
  }

  if (offset !== centralDirectoryEnd) {
    throw new Error("ZIP archive has an invalid central directory");
  }
}
