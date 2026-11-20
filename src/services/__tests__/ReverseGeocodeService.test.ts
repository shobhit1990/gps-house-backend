import { withHouseNumber } from "../ReverseGeocodeService";

describe("withHouseNumber", () => {
  it("prefixes the house number when display_name lacks it", () => {
    expect(withHouseNumber("Vikrant Khand, Gomti Nagar, Lucknow, India", "12/4")).toBe(
      "12/4, Vikrant Khand, Gomti Nagar, Lucknow, India",
    );
  });

  it("does not duplicate a house number Nominatim already put in display_name", () => {
    const displayName = "77, Unter den Linden, Mitte, Berlin, 10117, Deutschland";
    expect(withHouseNumber(displayName, "77")).toBe(displayName);
  });

  it("leaves the address unchanged when there is no house number", () => {
    expect(withHouseNumber("Hazratganj, Lucknow, India", null)).toBe("Hazratganj, Lucknow, India");
  });
});
