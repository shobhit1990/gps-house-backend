import { EntityManager } from "@mikro-orm/mysql";
import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";
import { Client } from "../../domain/entities/mysql/Client";
import { Device } from "../../domain/entities/mysql/Device";
import { DriverDetail } from "../../domain/entities/mysql/DriverDetail";
import { Expense } from "../../domain/entities/mysql/Expense";
import { ExpenseType } from "../../domain/entities/mysql/ExpenseType";
import { Transporter } from "../../domain/entities/mysql/Transporter";
import { ExpenseFor } from "../../domain/enums/ExpenseFor";
import { Status } from "../../domain/enums/status";
import { IExpenseRepository } from "../../domain/repositories/mysql/IExpenseRepository";
import { ExpenseService } from "../ExpenseService";

describe("ExpenseService.getExpenses", () => {
  it("returns the expense with full client, transporter, vehicle, driver, and type", async () => {
    const client = Object.assign(new Client(), {
      externalId: "client-1",
      userName: "client-user",
      companyName: "Client Co",
      name: "Client",
      email: "client@example.com",
      phone: 9999999999,
      address: "Lucknow",
      status: Status.ACTIVE,
      owner_name: { ownerName: "Owner" },
      language: { languageName: "English" },
      timezone: { timeZone: "Asia/Kolkata" },
      isDeleted: false,
    });
    const transporter = Object.assign(new Transporter(), {
      externalId: "transporter-1",
      userName: "trans-user",
      companyName: "Trans Co",
      name: "Transporter",
      status: Status.ACTIVE,
      client,
      language: { languageName: "English" },
      timezone: { timeZone: "Asia/Kolkata" },
      isDeleted: false,
    });
    const device = Object.assign(new Device(), {
      externalId: "device-1",
      imei: "868120145233604",
      simNumber: "9876543210",
      simOperator: "airtel",
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const vehicle = Object.assign(new AddVehicle(), {
      externalId: "vehicle-1",
      vehicle: "UP78AB1234",
      mileage: 12,
      vehicleType: "car",
      overspeed: 80,
      parkingViolationAlarmOnIgnitionOn: false,
      isDeleted: false,
      device,
    });
    const driver = Object.assign(new DriverDetail(), {
      externalId: "driver-1",
      firstName: "Amit",
      lastName: "Singh",
      phoneNumber: "9000000000",
      client,
      transporter,
      isDeleted: false,
    });
    const expense = Object.assign(new Expense(), {
      externalId: "expense-1",
      client,
      transporter,
      expenseFor: ExpenseFor.VEHICLE_WISE,
      vehicle,
      driver,
      expenseName: "Diesel",
      expenseType: Object.assign(new ExpenseType(), {
        externalId: "type-1",
        expenseName: "Fuel",
        status: Status.ACTIVE,
      }),
      amount: "250.50",
      expenseDate: new Date("2026-03-01T00:00:00.000Z"),
      createdBy: client,
      status: Status.ACTIVE,
      isDeleted: false,
    });

    const service = new ExpenseService(
      {
        getExpenses: jest.fn(async () => [expense]),
      } as unknown as IExpenseRepository,
      {} as EntityManager,
    );

    const [row] = await service.getExpenses();

    expect(row).toMatchObject({
      id: "expense-1",
      expenseFor: ExpenseFor.VEHICLE_WISE,
      expenseName: "Diesel",
      amount: 250.5,
      client: {
        id: "client-1",
        companyName: "Client Co",
        owner_name: "Owner",
        language: "English",
        timezone: "Asia/Kolkata",
        phone: "9999999999",
      },
      transporter: {
        id: "transporter-1",
        companyName: "Trans Co",
        language: "English",
        client: { id: "client-1", companyName: "Client Co" },
      },
      vehicle: {
        id: "vehicle-1",
        vehicle: "UP78AB1234",
        mileage: 12,
        device: { id: "device-1", imei: "868120145233604" },
      },
      driver: {
        id: "driver-1",
        firstName: "Amit",
        lastName: "Singh",
        phoneNumber: "9000000000",
        licenseToDrive: [],
        geofences: [],
      },
      expenseType: { id: "type-1", expenseName: "Fuel", status: Status.ACTIVE },
      createdBy: { id: "client-1", companyName: "Client Co" },
      updatedBy: null,
    });
  });
});
