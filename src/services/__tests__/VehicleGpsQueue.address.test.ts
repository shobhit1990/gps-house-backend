import { ObjectId } from "mongodb";
import { VehicleGpsQueue } from "../VehicleGpsQueue";

const IMEI = "869689045305190";
const base = {
  deviceImei: IMEI,
  vehicleId: "veh-1",
  vehicleNumber: "UP32KC0845",
  speed: 25,
};

function queueItem(type: "location" | "status", data: Record<string, unknown>) {
  return { _id: new ObjectId(), type, data } as any;
}

describe("VehicleGpsQueue report stage — address on location history", () => {
  it("adds the device address to nearby location points only, never to status", async () => {
    const near = { ...base, latitude: 26.87031, longitude: 81.01536, locationTime: new Date() }; // ~5 m away
    const far = { ...base, latitude: 26.9, longitude: 81.1, locationTime: new Date() }; // ~9 km away
    const status = { deviceImei: IMEI, vehicleId: "veh-1", vehicleNumber: "UP32KC0845", ignition: "1" };

    const recordLocations = jest.fn().mockResolvedValue([]);
    const recordStatus = jest.fn().mockResolvedValue(undefined);
    const queueRepo = {
      getPendingReportItems: jest
        .fn()
        .mockResolvedValue([queueItem("location", near), queueItem("location", far), queueItem("status", status)]),
      markReportCompleted: jest.fn().mockResolvedValue(undefined),
      markReportFailed: jest.fn().mockResolvedValue(undefined),
    };
    const deviceRepo = {
      // DB stores the 0-padded variant; the queue carries the canonical IMEI.
      findDevicesByImeis: jest.fn().mockResolvedValue([
        {
          imei: `0${IMEI}`,
          address: "Vikrant Khand, Gomti Nagar, Lucknow, Uttar Pradesh, India",
          addressLatitude: 26.8703068,
          addressLongitude: 81.0153548,
        },
      ]),
    };

    const queue = new VehicleGpsQueue(
      { recordLocations, recordStatus } as any,
      queueRepo as any,
      {} as any,
      deviceRepo as any,
    ) as any;

    await expect(queue.processReportQueueBatch(1)).resolves.toBe(true);

    const saved = recordLocations.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[0].address).toBe("Vikrant Khand, Gomti Nagar, Lucknow, Uttar Pradesh, India");
    expect(saved[1].address).toBeUndefined();

    expect(recordStatus).toHaveBeenCalledTimes(1);
    expect(recordStatus.mock.calls[0][0]).not.toHaveProperty("address");
    expect(queueRepo.markReportCompleted.mock.calls[0][0]).toHaveLength(3);
  });

  it("still saves history without address when the device lookup fails", async () => {
    const point = { ...base, latitude: 26.87, longitude: 81.01, locationTime: new Date() };
    const recordLocations = jest.fn().mockResolvedValue([]);
    const queueRepo = {
      getPendingReportItems: jest.fn().mockResolvedValue([queueItem("location", point)]),
      markReportCompleted: jest.fn().mockResolvedValue(undefined),
      markReportFailed: jest.fn().mockResolvedValue(undefined),
    };
    const deviceRepo = { findDevicesByImeis: jest.fn().mockRejectedValue(new Error("mysql down")) };

    const queue = new VehicleGpsQueue(
      { recordLocations, recordStatus: jest.fn() } as any,
      queueRepo as any,
      {} as any,
      deviceRepo as any,
    ) as any;

    await queue.processReportQueueBatch(1);

    expect(recordLocations.mock.calls[0][0][0].address).toBeUndefined();
    expect(queueRepo.markReportFailed).not.toHaveBeenCalled();
  });
});
