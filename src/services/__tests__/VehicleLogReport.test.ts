import { EntityManager } from "@mikro-orm/mysql";
import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";
import { Device } from "../../domain/entities/mysql/Device";
import { ModifiedType } from "../../domain/enums/ModifiedType";
import { Status } from "../../domain/enums/status";
import { IAddVehicleRepository } from "../../domain/repositories/mysql/IAddVehicleRepository";
import { AddVehicleService } from "../AddVehicleService";
import { AppError } from "../../utils/errors";
import {
  parseModifiedType,
  parseVehicleLogMonth,
} from "../../utils/vehicleLogReport";

describe("vehicle log report filters", () => {
  it("reads the portal month picker as MM/YYYY", () => {
    const range = parseVehicleLogMonth("03/2026");
    expect(range?.from).toEqual(new Date(2026, 2, 1));
    expect(range?.to).toEqual(new Date(2026, 3, 1));
  });

  it("accepts the Month enum with a separate year", () => {
    const range = parseVehicleLogMonth("Mar", "2026");
    expect(range?.from).toEqual(new Date(2026, 2, 1));
    expect(range?.to).toEqual(new Date(2026, 3, 1));
  });

  it("rejects a month that does not match the year", () => {
    expect(() => parseVehicleLogMonth("03/2026", "2025")).toThrow(AppError);
  });

  it("maps modified type from the enum label", () => {
    expect(parseModifiedType("Sim No.")).toBe(ModifiedType.SIM_NO);
    expect(parseModifiedType("subscription")).toBe(ModifiedType.SUBSCRIPTION);
    expect(parseModifiedType("IMEI")).toBe(ModifiedType.IMEI);
  });

  it("rejects an unknown modified type", () => {
    expect(() => parseModifiedType("Engine")).toThrow(/modifiedType must be one of/);
  });
});

describe("AddVehicleService.getVehicleLogReport", () => {
  const updatedAt = new Date(2026, 2, 18, 9, 30, 0);

  function party(id: string) {
    return {
      externalId: id,
      userName: "user",
      name: "Name",
      companyName: "Company",
      email: null,
      phone: null,
      address: null,
      status: Status.ACTIVE,
      reason: null,
      language: { externalId: "lang-1", languageName: "English" },
      timezone: { externalId: "tz-1", timeZone: "Asia/Kolkata" },
      owner_name: null,
      clientImage: null,
      imeiNumber: null,
    };
  }

  function vehicle(): AddVehicle {
    const client = party("client-1");
    const device = Object.assign(new Device(), {
      externalId: "device-1",
      imei: "868120145233604",
      simNumber: "9876543210",
      simOperator: "airtel",
      status: Status.ACTIVE,
      isDeleted: false,
      ignitionWireConnected: false,
      ignitionWireNotConnected: false,
      airConditionWireConnected: false,
      attendance: false,
      timezoneSetting: false,
      createdAt: updatedAt,
      updatedAt,
      deviceType: { externalId: "type-1", deviceName: "GT06" },
      client,
    });
    return Object.assign(new AddVehicle(), {
      externalId: "vehicle-1",
      vehicle: "UP78AB1234",
      mileage: 12,
      vehicleType: "car",
      overspeed: 80,
      status: Status.ACTIVE,
      parkingViolationAlarmOnIgnitionOn: false,
      subscriptionStartDate: new Date(2026, 0, 1),
      subscriptionDueDate: new Date(2026, 11, 31),
      createdAt: updatedAt,
      updatedAt,
      device,
      client,
      transporter: { ...party("transporter-1"), client },
      isDeleted: false,
    });
  }

  it("returns the full vehicle payload and last updated date as modifiedDate", async () => {
    const getVehicleLogReport = jest.fn(async () => [vehicle()]);
    const service = new AddVehicleService(
      { getVehicleLogReport } as unknown as IAddVehicleRepository,
      {} as EntityManager,
    );

    const rows = await service.getVehicleLogReport({
      modifiedType: "Subscription",
      month: "03/2026",
      search: "UP78",
    });

    expect(getVehicleLogReport).toHaveBeenCalledWith({
      modifiedType: ModifiedType.SUBSCRIPTION,
      search: "UP78",
      updatedFrom: new Date(2026, 2, 1),
      updatedTo: new Date(2026, 3, 1),
    });
    expect(rows[0]).toMatchObject({
      sn: 1,
      id: "vehicle-1",
      vehicle: "UP78AB1234",
      mileage: 12,
      modifiedType: ModifiedType.SUBSCRIPTION,
      modifiedDate: updatedAt,
      updatedAt,
      status: Status.ACTIVE,
      client: { id: "client-1", companyName: "Company" },
      device: { id: "device-1", imei: "868120145233604", simNumber: "9876543210" },
      transporter: { id: "transporter-1", companyName: "Company" },
    });
  });
});
