/**
 * Parses the ASCII reply a GT06-family tracker sends (protocol 0x15/0x21) for a location
 * query command such as `WHERE#` / `DWXX#`. Known reply shapes:
 *   "Lat:N28.612345,Lon:E77.123456,Course:0.00,Speed:0.00Km/h,DateTime:2026-10-09 10:00:00"
 *   "Lat:N26.427052,Lon:E80.297531,S:0.00km/h,T:2026-10-09 21:33:54,V:13.4V,ACC:OFF"  (FT112)
 *   "Current position!Lat:N28.612345,Lon:E77.123456,..."
 *   "http://maps.google.com/maps?q=N28.612345,E77.123456"
 */

export interface GpsLocationReply {
  latitude: number;
  longitude: number;
  speed?: number;
  direction?: number;
  /** From "ACC:ON/OFF" when present. */
  ignitionStatus?: boolean;
}

const LAT_PATTERN = /Lat[a-z]*\s*[:=]\s*([NS])?\s*(-?\d+(?:\.\d+)?)/i;
const LON_PATTERN = /Lo?ng?[a-z]*\s*[:=]\s*([EW])?\s*(-?\d+(?:\.\d+)?)/i;
const MAP_URL_PATTERN = /[?&]q=\s*([NS])?\s*(-?\d+(?:\.\d+)?)\s*,\s*([EW])?\s*(-?\d+(?:\.\d+)?)/i;
const SPEED_PATTERN = /(?:^|[,;!\s])(?:Speed|S)\s*[:=]\s*(\d+(?:\.\d+)?)/i;
const ACC_PATTERN = /ACC\s*[:=]\s*(ON|OFF)/i;
const NO_LOCATION_PATTERN = /^\s*No\s+location/i;
const COURSE_PATTERN = /Course\s*[:=]\s*(\d+(?:\.\d+)?)/i;

function signed(value: string, hemisphere: string | undefined, negativeHemisphere: string): number {
  const num = Number(value);
  return hemisphere && hemisphere.toUpperCase() === negativeHemisphere ? -Math.abs(num) : num;
}

export function parseGpsLocationReply(text: string | undefined | null): GpsLocationReply | null {
  if (!text) return null;

  let latitude: number | undefined;
  let longitude: number | undefined;

  const lat = LAT_PATTERN.exec(text);
  const lon = LON_PATTERN.exec(text);
  if (lat && lon) {
    latitude = signed(lat[2]!, lat[1], 'S');
    longitude = signed(lon[2]!, lon[1], 'W');
  } else {
    const url = MAP_URL_PATTERN.exec(text);
    if (url) {
      latitude = signed(url[2]!, url[1], 'S');
      longitude = signed(url[4]!, url[3], 'W');
    }
  }

  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  const speed = SPEED_PATTERN.exec(text);
  const course = COURSE_PATTERN.exec(text);
  const acc = ACC_PATTERN.exec(text);
  return {
    latitude,
    longitude,
    speed: speed ? Number(speed[1]) : undefined,
    direction: course ? Math.round(Number(course[1])) : undefined,
    ...(acc ? { ignitionStatus: acc[1]!.toUpperCase() === 'ON' } : {}),
  };
}

/** Device answered the location query but has no GPS fix, e.g. "No location;T:...,ACC:OFF". */
export function isNoLocationReply(text: string | undefined | null): boolean {
  return Boolean(text && NO_LOCATION_PATTERN.test(text));
}
