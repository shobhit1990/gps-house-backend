import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";
import { TravelTrackPoint } from "../../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { TravelSummaryService } from "../TravelSummaryService";
import { IAddVehicleService } from "../interfaces/IAddVehicleService";
import { parseTravelDateTime, summarizeTravelPoints } from "../../utils/travelSummary";
import { AppError } from "../../utils/errors";

function point(
  partial: Partial<TravelTrackPoint> & Pick<TravelTrackPoint, "locationTime" | "speed">,
): TravelTrackPoint {
  return {
    vehicleId: "vehicle-1",
    latitude: 26.8,
    longitude: 80.9,
    ignitionStatus: false,
    distance: 0,
    address: null,
    ...partial,
  };
}

describe("travel summary", () => {
  it("parses the portal date range", () => {
    expect(parseTravelDateTime("20/11/2026 00:00", "from")).toEqual(
      new Date(2026, 10, 20, 0, 0, 0),
    );
    expect(parseTravelDateTime("20/11/2026 23:59", "to")).toEqual(
      new Date(2026, 10, 20, 23, 59, 59),
    );
  });

  it("sums distance and splits running, idle, and stop time", () => {
    const summary = summarizeTravelPoints([
      point({
        locationTime: new Date("2026-11-20T00:00:00.000Z"),
        speed: 40,
        ignitionStatus: true,
        distance: 0,
        address: "Start",
      }),
      point({
        locationTime: new Date("2026-11-20T00:10:00.000Z"),
        speed: 0,
        ignitionStatus: true,
        distance: 5000,
        latitude: 26.85,
      }),
      point({
        locationTime: new Date("2026-11-20T00:20:00.000Z"),
        speed: 0,
        ignitionStatus: false,
        distance: 0,
        address: "End",
        latitude: 26.86,
      }),
    ]);

    expect(summary).toMatchObject({
      startAddress: "Start",
      endAddress: "End",
      distanceMeters: 5000,
      distanceKm: 5,
      maxSpeed: 40,
      avgSpeed: 40,
      runningMs: 10 * 60 * 1000,
      idleMs: 10 * 60 * 1000,
      stopMs: 0,
      pointCount: 3,
    });
  });

  it("rejects an inverted range", () => {
    const service = new TravelSummaryService(
      {} as IVehicleGpsDeviceRepository,
      {} as IVehicleGpsTrackingRepository,
      {} as IAddVehicleService,
    );
    expect(
      service.getTravelSummary({
        from: new Date("2026-11-20T10:00:00.000Z"),
        to: new Date("2026-11-20T09:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("returns the full vehicle payload and travel stats for the filter", async () => {
    const vehicle = Object.assign(new AddVehicle(), { externalId: "vehicle-1" });
    const listVehiclesForTravelSummary = jest.fn(async () => [vehicle]);
    const findTravelPoints = jest.fn(async () => [
      point({
        locationTime: new Date("2026-11-20T01:00:00.000Z"),
        speed: 30,
        distance: 1000,
        ignitionStatus: true,
      }),
    ]);
    const mapVehicleDetail = jest.fn(() => ({
      id: "vehicle-1",
      vehicle: "UP78AB1234",
      client: { id: "client-1", companyName: "Client Co" },
      transporter: { id: "transporter-1", companyName: "Trans Co" },
    }));

    const service = new TravelSummaryService(
      { listVehiclesForTravelSummary } as unknown as IVehicleGpsDeviceRepository,
      { findTravelPoints } as unknown as IVehicleGpsTrackingRepository,
      { mapVehicleDetail } as unknown as IAddVehicleService,
    );

    const rows = await service.getTravelSummary({
      clientId: "client-1",
      transporterId: "transporter-1",
      vehicleId: "vehicle-1",
      from: new Date("2026-11-20T00:00:00.000Z"),
      to: new Date("2026-11-20T23:59:59.000Z"),
    });

    expect(listVehiclesForTravelSummary).toHaveBeenCalledWith({
      clientId: "client-1",
      transporterId: "transporter-1",
      vehicleId: "vehicle-1",
      search: undefined,
    });
    expect(rows[0]).toMatchObject({
      sn: 1,
      id: "vehicle-1",
      vehicle: "UP78AB1234",
      client: { companyName: "Client Co" },
      transporter: { companyName: "Trans Co" },
      travel: { distanceMeters: 1000, distanceKm: 1, maxSpeed: 30, pointCount: 1 },
    });
  });
});
