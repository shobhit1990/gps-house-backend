/**
 * IMEI variants for GT06/GT800 BCD login packets vs DB master values
 * (often 15 digits, sometimes stored/parsed with a leading 0).
 */
export function normalizeGpsImei(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\D/g, '');
}

/**
 * Canonical 15-digit IMEI. GT06 login BCD often yields 16 digits with a leading 0
 * padding nibble; some devices may send extra leading zeros.
 */
export function canonicalGpsImei(value: string | null | undefined): string {
  let digits = normalizeGpsImei(value);
  if (!digits) return '';

  while (digits.length > 15 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/** Decode IMEI from a GT06/GT800 hex login packet (8 BCD bytes at indexes 8..24). */
export function decodeGt06LoginImei(packet: string): string {
  const fromFullBcd = canonicalGpsImei(packet.substring(8, 24));
  if (fromFullBcd.length >= 15) return fromFullBcd;

  const fromLegacySlice = canonicalGpsImei(packet.substring(9, 24));
  return fromLegacySlice || fromFullBcd;
}

export function gpsImeiLookupVariants(value: string | null | undefined): string[] {
  const canonical = canonicalGpsImei(value);
  const raw = normalizeGpsImei(value);
  if (!canonical && !raw) return [];

  const variants = new Set<string>();
  if (canonical) {
    variants.add(canonical);
    if (canonical.length === 15) {
      variants.add(`0${canonical}`);
    }
  }
  if (raw) {
    variants.add(raw);
    if (raw.length === 16 && raw.startsWith('0')) {
      variants.add(raw.slice(1));
    }
  }
  return [...variants];
}
