import { IdleSummaryStatus } from "../../domain/enums/IdleSummaryStatus";
import { TravelTrackPoint } from "../../domain/models/TravelSummary";
import { buildIdleSummarySegments } from "../../utils/idleSummary";

function point(
  partial: Partial<TravelTrackPoint> &
    Pick<TravelTrackPoint, "locationTime" | "speed" | "ignitionStatus">,
): TravelTrackPoint {
  return {
    vehicleId: "vehicle-1",
    latitude: 26.8,
    longitude: 80.9,
    distance: 0,
    address: null,
    ...partial,
  };
}

describe("idle summary", () => {
  it("builds idle and ignition-off segments and respects min duration", () => {
    const segments = buildIdleSummarySegments(
      [
        point({
          locationTime: new Date("2026-11-21T00:00:00.000Z"),
          speed: 0,
          ignitionStatus: true,
          address: "Idle start",
        }),
        point({
          locationTime: new Date("2026-11-21T00:10:00.000Z"),
          speed: 0,
          ignitionStatus: true,
        }),
        point({
          locationTime: new Date("2026-11-21T00:10:30.000Z"),
          speed: 20,
          ignitionStatus: true,
        }),
        point({
          locationTime: new Date("2026-11-21T00:11:00.000Z"),
          speed: 0,
          ignitionStatus: false,
          address: "Off start",
        }),
        point({
          locationTime: new Date("2026-11-21T00:16:00.000Z"),
          speed: 0,
          ignitionStatus: false,
        }),
      ],
      { minDurationMinutes: 5 },
    );

    expect(segments).toEqual([
      expect.objectContaining({
        status: IdleSummaryStatus.IDLE,
        durationMinutes: 10,
        address: "Idle start",
      }),
      expect.objectContaining({
        status: IdleSummaryStatus.IGNITION_OFF,
        durationMinutes: 5,
        address: "Off start",
      }),
    ]);
  });

  it("filters segments by IdleSummaryStatus enum", () => {
    const points = [
      point({
        locationTime: new Date("2026-11-21T00:00:00.000Z"),
        speed: 0,
        ignitionStatus: true,
        address: "Idle only",
      }),
      point({
        locationTime: new Date("2026-11-21T00:10:00.000Z"),
        speed: 0,
        ignitionStatus: true,
      }),
    ];

    expect(
      buildIdleSummarySegments(points, {
        minDurationMinutes: 5,
        statuses: [IdleSummaryStatus.IGNITION_OFF],
      }),
    ).toHaveLength(0);

    expect(
      buildIdleSummarySegments(points, {
        minDurationMinutes: 5,
        statuses: [IdleSummaryStatus.IDLE],
      }),
    ).toEqual([
      expect.objectContaining({
        status: IdleSummaryStatus.IDLE,
        address: "Idle only",
      }),
    ]);
  });
});
