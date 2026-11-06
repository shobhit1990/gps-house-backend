import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateDriverDetailDto,
  UpdateDriverDetailDto,
} from "../domain/dto/DriverDetailDto";
import { Client } from "../domain/entities/mysql/Client";
import { DriverDetail } from "../domain/entities/mysql/DriverDetail";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { License } from "../domain/entities/mysql/License";
import { IDriverDetailRepository } from "../domain/repositories/mysql/IDriverDetailRepository";
import { DriverDetailService } from "../services/DriverDetailService";

jest.mock("../domain/entities/mysql/DriverDetail", () => {
  const createCollection = () => ({
    items: [] as unknown[],
    getItems() {
      return this.items;
    },
    set(items: unknown[]) {
      this.items = items;
    },
  });
  return {
    DriverDetail: class {
      licenseToDrive = createCollection();
      geofences = createCollection();
      createdAt = new Date();
      updatedAt = new Date();
    },
  };
});

const client = Object.assign(new Client(), {
  id: 1,
  externalId: "client-id",
  name: "Client",
  companyName: "Client Company",
});

const makeLicense = (externalId: string) =>
  Object.assign(new License(), {
    id: Number(externalId.replace("license-", "")),
    externalId,
    license: externalId,
  });

const makeGeofence = (externalId: string) =>
  Object.assign(new Geofence(), {
    id: Number(externalId.replace("geofence-", "")),
    externalId,
    name: externalId,
  });

const makeDriverDetail = () => {
  const detail = Object.assign(new DriverDetail(), {
    id: 1,
    externalId: "driver-id",
    client,
    firstName: "Test",
    lastName: "Driver",
  });
  return detail;
};

function makeService() {
  const licenses = ["license-1", "license-2"].map(makeLicense);
  const geofences = ["geofence-1", "geofence-2"].map(makeGeofence);
  const detail = makeDriverDetail();
  detail.licenseToDrive.set([licenses[0]]);
  detail.geofences.set([geofences[0]]);

  const em = {
    fork: () => ({
      findOne: jest.fn(async (entity: unknown) =>
        entity === Client ? client : null,
      ),
      find: jest.fn(
        async (entity: unknown, where: { externalId: { $in: string[] } }) => {
          const available = entity === License ? licenses : geofences;
          return available.filter((record) =>
            where.externalId.$in.includes(record.externalId),
          );
        },
      ),
    }),
  } as unknown as EntityManager;

  const repository = {
    getDriverDetails: jest.fn(async () => [detail]),
    getDriverDetailById: jest.fn(async () => detail),
    createDriverDetail: jest.fn(async (created: DriverDetail) => created),
    updateDriverDetail: jest.fn(async (updated: DriverDetail) => updated),
    deleteDriverDetail: jest.fn(async () => undefined),
  } as unknown as IDriverDetailRepository;

  return {
    service: new DriverDetailService(repository, em),
    repository,
    detail,
  };
}

const relationCases = [
  {
    name: "one ID",
    licenseToDrive: ["license-1"],
    geofences: ["geofence-1"],
    expectedCount: 1,
  },
  {
    name: "multiple IDs",
    licenseToDrive: ["license-1", "license-2"],
    geofences: ["geofence-1", "geofence-2"],
    expectedCount: 2,
  },
  {
    name: "empty arrays",
    licenseToDrive: [],
    geofences: [],
    expectedCount: 0,
  },
  {
    name: "omitted fields",
    licenseToDrive: undefined,
    geofences: undefined,
    expectedCount: 0,
  },
];

describe("DriverDetail ManyToMany relation inputs", () => {
  test.each([
    "dateOfJoining",
    "dateOfLeaving",
    "dateOfBirth",
    "licenseIssueDate",
    "licenseExpiryDate",
    "lifeInsuranceExpiryDate",
    "mediclaimExpiryDate",
  ])(
    "%s rejects invalid calendar dates and remains optional",
    async (field) => {
      const omittedDate = plainToInstance(UpdateDriverDetailDto, {});
      expect(await validate(omittedDate)).toEqual([]);

      const invalidDate = plainToInstance(UpdateDriverDetailDto, {
        [field]: "2024-02-30",
      });
      expect(
        (await validate(invalidDate)).map(({ property }) => property),
      ).toContain(field);
    },
  );

  test.each([
    ["firstName", { lastName: "Driver" }],
    ["lastName", { firstName: "Test" }],
  ])("create requires %s", async (_field, names) => {
    const dto = plainToInstance(CreateDriverDetailDto, {
      client: "client-id",
      ...names,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map(({ property }) => property)).toContain(_field);
  });

  test("create rejects empty first and last names", async () => {
    const dto = plainToInstance(CreateDriverDetailDto, {
      client: "client-id",
      firstName: " ",
      lastName: "",
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(["firstName", "lastName"]),
    );
  });

  test("update allows omitted names and validates provided names", async () => {
    const omittedNames = plainToInstance(UpdateDriverDetailDto, {});
    expect(
      await validate(omittedNames, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toEqual([]);

    const emptyName = plainToInstance(UpdateDriverDetailDto, {
      firstName: "",
    });
    expect(
      (await validate(emptyName)).map(({ property }) => property),
    ).toContain("firstName");
  });

  test("driver detail response omits soft-deleted licenses", async () => {
    const { service, detail } = makeService();
    const activeLicense = makeLicense("license-1");
    const deletedLicense = Object.assign(makeLicense("license-2"), {
      isDeleted: true,
    });
    detail.licenseToDrive.set([activeLicense, deletedLicense]);

    const [response] = await service.getDriverDetails();

    expect(response.licenseToDrive).toEqual([
      { id: activeLicense.externalId, license: activeLicense.license },
    ]);
  });

  test.each(relationCases)("create accepts $name", async (relations) => {
    const { service, repository } = makeService();
    const dto = plainToInstance(CreateDriverDetailDto, {
      client: "client-id",
      firstName: "Test",
      lastName: "Driver",
      ...(relations.licenseToDrive !== undefined && {
        licenseToDrive: relations.licenseToDrive,
      }),
      ...(relations.geofences !== undefined && {
        geofences: relations.geofences,
      }),
    });

    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    const result = await service.createDriverDetail(dto);
    expect(result.licenseToDrive).toHaveLength(relations.expectedCount);
    expect(result.geofences).toHaveLength(relations.expectedCount);
    expect(repository.createDriverDetail).toHaveBeenCalledTimes(1);
  });

  test.each(relationCases)("update accepts $name", async (relations) => {
    const { service, repository, detail } = makeService();
    const payload = {
      ...(relations.licenseToDrive !== undefined && {
        licenseToDrive: relations.licenseToDrive,
      }),
      ...(relations.geofences !== undefined && {
        geofences: relations.geofences,
      }),
    };
    const dto = plainToInstance(UpdateDriverDetailDto, payload);

    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    const result = await service.updateDriverDetail("driver-id", dto);
    const expectedCount =
      relations.licenseToDrive === undefined ? 1 : relations.expectedCount;
    expect(result.licenseToDrive).toHaveLength(expectedCount);
    expect(result.geofences).toHaveLength(
      relations.geofences === undefined ? 1 : relations.expectedCount,
    );
    expect(repository.updateDriverDetail).toHaveBeenCalledTimes(1);
    expect(detail.licenseToDrive.getItems()).toHaveLength(expectedCount);
  });

  test.each([
    ["licenseToDrive", ["unknown-license"]],
    ["geofences", ["unknown-geofence"]],
  ] as const)(
    "create rejects an unknown %s ID with HTTP 400",
    async (field, ids) => {
      const { service } = makeService();
      const payload = {
        client: "client-id",
        firstName: "Test",
        lastName: "Driver",
        [field]: ids,
      };
      const dto = plainToInstance(CreateDriverDetailDto, payload);

      await expect(service.createDriverDetail(dto)).rejects.toMatchObject({
        statusCode: 400,
      });
    },
  );

  test.each([
    ["licenseToDrive", ["unknown-license"]],
    ["geofences", ["unknown-geofence"]],
  ] as const)(
    "update rejects an unknown %s ID with HTTP 400",
    async (field, ids) => {
      const { service } = makeService();
      const dto = plainToInstance(UpdateDriverDetailDto, { [field]: ids });

      await expect(
        service.updateDriverDetail("driver-id", dto),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    },
  );

  test("validation requires each relation field to be an array of strings", async () => {
    const dto = plainToInstance(UpdateDriverDetailDto, {
      licenseToDrive: "license-1",
      geofences: [1],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(["licenseToDrive", "geofences"]),
    );
  });
});
