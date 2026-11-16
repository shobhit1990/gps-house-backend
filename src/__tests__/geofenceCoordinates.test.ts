import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateGeofenceDto,
  UpdateGeofenceDto,
} from "../domain/dto/GeofenceDto";
import { Client } from "../domain/entities/mysql/Client";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { GeofType } from "../domain/entities/mysql/GeofType";
import { User } from "../domain/entities/mysql/User";
import { Shapes } from "../domain/enums/Shapes";
import { Status } from "../domain/enums/status";
import { IGeofenceRepository } from "../domain/repositories/mysql/IGeofenceRepository";
import { GeofenceService } from "../services/GeofenceService";

const type = Object.assign(new GeofType(), {
  id: 1,
  externalId: "type-id",
  geofType: "test",
});

const makeGeofence = (latitude: number[], longitude: number[]) =>
  Object.assign(new Geofence(), {
    id: 1,
    externalId: "geofence-id",
    name: "Test geofence",
    type,
    latitude,
    longitude,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

function makeService(latitude = [10], longitude = [20]) {
  let geofence: Geofence = makeGeofence(latitude, longitude);
  const repository = {
    getGeofences: jest.fn(async () => [geofence]),
    getGeofenceById: jest.fn(async () => geofence),
    createGeofence: jest.fn(async (value: Geofence) => {
      geofence = value;
      return value;
    }),
    updateGeofence: jest.fn(async (value: Geofence) => {
      geofence = value;
      return value;
    }),
    deleteGeofence: jest.fn(async () => undefined),
  } as unknown as IGeofenceRepository;
  const em = {
    fork: () => ({
      findOne: jest.fn(async () => type),
    }),
  } as unknown as EntityManager;
  return {
    service: new GeofenceService(repository, em),
    repository,
    geofence,
  };
}

const createPayload = (latitude: number[], longitude: number[]) =>
  plainToInstance(CreateGeofenceDto, {
    name: "Test geofence",
    type: "type-id",
    assignType: "client",
    shapes: "polygon",
    latitude,
    longitude,
  });

describe("Geofence coordinate arrays", () => {
  test.each([
    { name: "one coordinate", latitude: [10], longitude: [20] },
    {
      name: "multiple coordinates",
      latitude: [10, 11],
      longitude: [20, 21],
    },
  ])("create validates and returns $name", async ({ latitude, longitude }) => {
    const { service, repository } = makeService();
    const dto = createPayload(latitude, longitude);
    expect(await validate(dto)).toEqual([]);

    const result = await service.createGeofence(dto);
    expect(result.latitude).toEqual(latitude);
    expect(result.longitude).toEqual(longitude);
    expect(repository.createGeofence).toHaveBeenCalledTimes(1);
  });

  test("Shapes.CIRCLE is spelled circle", () => {
    expect(Shapes.CIRCLE).toBe("circle");
    expect(Object.values(Shapes)).toEqual([
      "circle",
      "polygon",
      "rectangle",
    ]);
    expect(Object.values(Shapes)).not.toContain("cirlce'");
  });

  test("create requires a supported shapes enum value", async () => {
    const { service, repository } = makeService();
    const missingShapes = plainToInstance(CreateGeofenceDto, {
      name: "Test geofence",
      type: "type-id",
      assignType: "client",
      latitude: [10],
      longitude: [20],
    });
    expect(await validate(missingShapes)).not.toEqual([]);

    const validCircle = plainToInstance(CreateGeofenceDto, {
      name: "Test geofence",
      type: "type-id",
      assignType: "client",
      shapes: "circle",
      latitude: [10],
      longitude: [20],
    });
    expect(await validate(validCircle)).toEqual([]);

    const invalidShapes = plainToInstance(CreateGeofenceDto, {
      name: "Test geofence",
      type: "type-id",
      assignType: "client",
      shapes: "hexagon",
      latitude: [10],
      longitude: [20],
    });
    expect(
      (await validate(invalidShapes)).map(({ property }) => property),
    ).toContain("shapes");
    expect(repository.createGeofence).not.toHaveBeenCalled();

    const dto = createPayload([10], [20]);
    const result = await service.createGeofence(dto);
    expect(result.shapes).toBe("polygon");
  });

  test("update accepts a supported shapes value", async () => {
    const { service, repository } = makeService();
    const dto = plainToInstance(UpdateGeofenceDto, { shapes: "rectangle" });
    expect(await validate(dto)).toEqual([]);

    const result = await service.updateGeofence("geofence-id", dto);
    expect(result.shapes).toBe("rectangle");
    expect(repository.updateGeofence).toHaveBeenCalledTimes(1);
  });

  test("create resolves audit actor via User.externalId", async () => {
    const actorClient = Object.assign(new Client(), {
      id: 99,
      externalId: "shared-external-id",
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const user = Object.assign(new User(), {
      id: 7,
      externalId: "shared-external-id",
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const findOne = jest.fn(
      async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === GeofType) return type;
        if (entity === User && where.externalId === "shared-external-id") {
          return user;
        }
        if (entity === Client && where.externalId === "shared-external-id") {
          return actorClient;
        }
        if (entity === User && where.id !== undefined) {
          throw new Error("must not look up actor by User.id");
        }
        if (entity === Client && where.id !== undefined) {
          throw new Error("must not look up actor by Client.id");
        }
        return null;
      },
    );
    const { service, repository } = makeService();
    (service as unknown as { em: EntityManager }).em = {
      fork: () => ({ findOne }),
    } as unknown as EntityManager;

    await service.createGeofence(createPayload([10], [20]), "shared-external-id");

    expect(repository.createGeofence).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: actorClient }),
    );
    expect(findOne).toHaveBeenCalledWith(
      User,
      expect.objectContaining({ externalId: "shared-external-id" }),
    );
    expect(findOne).toHaveBeenCalledWith(
      Client,
      expect.objectContaining({ externalId: "shared-external-id" }),
    );
  });

  test("update keeps an unchanged type without re-validating it", async () => {
    const findOne = jest.fn(async () => {
      throw new Error("findGeofType should not run for an unchanged type");
    });
    const { service, repository } = makeService();
    (service as unknown as { em: EntityManager }).em = {
      fork: () => ({ findOne }),
    } as unknown as EntityManager;
    const dto = plainToInstance(UpdateGeofenceDto, {
      type: "type-id",
      name: "Renamed geofence",
    });

    const result = await service.updateGeofence("geofence-id", dto);

    expect(result.type.id).toBe("type-id");
    expect(result.name).toBe("Renamed geofence");
    expect(findOne).not.toHaveBeenCalled();
    expect(repository.updateGeofence).toHaveBeenCalledTimes(1);
  });

  test("update still validates a changed type", async () => {
    const findOne = jest.fn(async () => null);
    const { service, repository } = makeService();
    (service as unknown as { em: EntityManager }).em = {
      fork: () => ({ findOne }),
    } as unknown as EntityManager;
    const dto = plainToInstance(UpdateGeofenceDto, { type: "other-type-id" });

    await expect(
      service.updateGeofence("geofence-id", dto),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(findOne).toHaveBeenCalled();
    expect(repository.updateGeofence).not.toHaveBeenCalled();
  });

  test("update clears geofenceCode and transitTime when passed null", async () => {
    const { service, repository, geofence } = makeService();
    geofence.geofenceCode = "existing-code";
    geofence.transitTime = 3;
    const dto = plainToInstance(UpdateGeofenceDto, {
      geofenceCode: null,
      transitTime: null,
    });

    expect(await validate(dto)).toEqual([]);
    const result = await service.updateGeofence("geofence-id", dto);

    expect(result.geofenceCode).toBeNull();
    expect(result.transitTime).toBeNull();
    expect(repository.updateGeofence).toHaveBeenCalledTimes(1);
  });

  test.each([
    { name: "one coordinate", latitude: [10], longitude: [20] },
    {
      name: "multiple coordinates",
      latitude: [10, 11],
      longitude: [20, 21],
    },
  ])("update accepts $name", async ({ latitude, longitude }) => {
    const { service, repository } = makeService();
    const dto = plainToInstance(UpdateGeofenceDto, { latitude, longitude });
    expect(await validate(dto)).toEqual([]);

    const result = await service.updateGeofence("geofence-id", dto);
    expect(result.latitude).toEqual(latitude);
    expect(result.longitude).toEqual(longitude);
    expect(repository.updateGeofence).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["create", () => createPayload([], [])],
    ["update", () => plainToInstance(UpdateGeofenceDto, { latitude: [] })],
  ])("%s rejects empty coordinate arrays", async (_operation, makeDto) => {
    const errors = await validate(makeDto());
    expect(errors.length).toBeGreaterThan(0);
  });

  test("coordinate fields may be omitted from update", async () => {
    const { service, geofence } = makeService([10], [20]);
    const dto = plainToInstance(UpdateGeofenceDto, {});
    expect(await validate(dto)).toEqual([]);

    const result = await service.updateGeofence("geofence-id", dto);
    expect(result.latitude).toEqual(geofence.latitude);
    expect(result.longitude).toEqual(geofence.longitude);
  });

  test("create rejects arrays with different coordinate counts", async () => {
    const { service, repository } = makeService();
    await expect(
      service.createGeofence(createPayload([10, 11], [20])),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.createGeofence).not.toHaveBeenCalled();
  });

  test("update rejects coordinates with different counts", async () => {
    const { service, repository } = makeService([10], [20]);
    const dto = plainToInstance(UpdateGeofenceDto, {
      latitude: [10, 11],
    });
    await expect(
      service.updateGeofence("geofence-id", dto),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.updateGeofence).not.toHaveBeenCalled();
  });

  test("rejects coordinates outside latitude or longitude bounds", async () => {
    const { service, repository } = makeService();
    await expect(
      service.createGeofence(createPayload([91], [20])),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.createGeofence).not.toHaveBeenCalled();
  });
});
