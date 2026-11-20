export type ReverseGeocodeResult = {
  /** Full formatted address (Nominatim `display_name`), led by the house number when OSM has one. */
  address: string;
  /** OSM house number (`address.house_number`); null when the point has none mapped. */
  houseNumber: string | null;
  /** Structured parts (road, suburb, city, state, postcode, …) when available. */
  components: Record<string, string> | null;
};

export type ReverseGeocodeOptions = {
  /**
   * How long to wait for a free rate-limit slot. 0 (default) = give up immediately when
   * another lookup ran within the last GEOCODER_MIN_INTERVAL_MS (background callers retry later).
   */
  waitForSlotMs?: number;
};

export interface IReverseGeocodeService {
  isEnabled(): boolean;
  /** Cached reverse geocode; null when disabled, rate-limited, or the provider has no result. */
  reverse(
    latitude: number,
    longitude: number,
    options?: ReverseGeocodeOptions,
  ): Promise<ReverseGeocodeResult | null>;
}
