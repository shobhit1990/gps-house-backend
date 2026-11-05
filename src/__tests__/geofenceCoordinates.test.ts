import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateGeofenceDto,
  UpdateGeofenceDto,
} from "../domain/dto/GeofenceDto";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { GeofType } from "../domain/entities/mysql/GeofType";
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
