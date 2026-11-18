import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { FormError } from "../../../../domain/dto/FormError";
import { AddInventory } from "../../../../domain/entities/mysql/AddInventory";
import { Client } from "../../../../domain/entities/mysql/Client";
import { DeviceType } from "../../../../domain/entities/mysql/DeviceType";
import { Technician } from "../../../../domain/entities/mysql/Technician";
import { IAddInventoryRepository } from "../../../../domain/repositories/mysql/IAddInventoryRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class AddInventoryRepository implements IAddInventoryRepository {
  constructor(private readonly em: EntityManager) {}

  async getAddInventories(): Promise<AddInventory[]> {
    return this.em.fork().find(
      AddInventory,
      { isDeleted: false },
      {
        populate: ["deviceType", "client", "technician"]
      },
    );
  }

  async getAddInventoryById(externalId: string): Promise<AddInventory | null> {
    return this.em
      .fork()
      .findOne(
        AddInventory,
        { externalId, isDeleted: false },
        { populate: ["deviceType", "client", "technician"] },
      );
  }

  async createAddInventory(inventory: AddInventory): Promise<AddInventory> {
    const em = this.em.fork();
    inventory.deviceType = em.getReference(DeviceType, inventory.deviceType.id);
    if (inventory.client) {
      inventory.client = em.getReference(Client, inventory.client.id);
    }
    if (inventory.technician) {
      inventory.technician = em.getReference(
        Technician,
        inventory.technician.id,
      );
    }
    if (inventory.createdBy) {
      inventory.createdBy = em.getReference(Client, inventory.createdBy.id);
    }
    try {
      await em.persistAndFlush(inventory);
    } catch (error: unknown) {
      this.throwDuplicateImeiError(error);
    }
    await em.populate(inventory, ["deviceType", "client", "technician"]);
    return inventory;
  }

  async bulkCreateAddInventories(
    inventories: AddInventory[],
  ): Promise<{ insertedRecords: number; duplicateRecords: number }> {
    if (inventories.length === 0) {
      return { insertedRecords: 0, duplicateRecords: 0 };
    }

    const em = this.em.fork();
    return em.transactional(async (transactionalEm) => {
      const imeiValues = [
        ...new Set(
          inventories
            .map((inventory) => inventory.imei?.trim())
            .filter((imei): imei is string => Boolean(imei)),
        ),
      ];
      const existingImei = imeiValues.length
        ? await transactionalEm.find(AddInventory, {
            imei: { $in: imeiValues },
            isDeleted: false,
          })
        : [];
      const existingImeiSet = new Set(
        existingImei
          .map((inventory) => inventory.imei?.trim().toLowerCase())
          .filter((imei): imei is string => Boolean(imei)),
      );

      const newRecords: AddInventory[] = [];
      let duplicateRecords = 0;
      for (const inventory of inventories) {
        const imeiKey = inventory.imei?.trim().toLowerCase();
        if (imeiKey && existingImeiSet.has(imeiKey)) {
          duplicateRecords += 1;
          continue;
        }
        if (imeiKey) existingImeiSet.add(imeiKey);

        inventory.deviceType = transactionalEm.getReference(
          DeviceType,
          inventory.deviceType.id,
        );
        if (inventory.client) {
          inventory.client = transactionalEm.getReference(
            Client,
            inventory.client.id,
          );
        }
        if (inventory.technician) {
          inventory.technician = transactionalEm.getReference(
            Technician,
            inventory.technician.id,
          );
        }
        if (inventory.createdBy) {
          inventory.createdBy = transactionalEm.getReference(
            Client,
            inventory.createdBy.id,
          );
        }
        newRecords.push(inventory);
      }

      if (newRecords.length > 0) {
        transactionalEm.persist(newRecords);
        await transactionalEm.flush();
      }

      return {
        insertedRecords: newRecords.length,
        duplicateRecords,
      };
    });
  }

  async updateAddInventory(inventory: AddInventory): Promise<AddInventory> {
    const em = this.em.fork();
    const existing = await em.findOne(
      AddInventory,
      { externalId: inventory.externalId, isDeleted: false },
      { populate: ["deviceType", "client", "technician"] },
    );
    if (!existing) {
      throw new AppError("Inventory not found", 404);
    }

    em.assign(existing, {
      inventoryType: inventory.inventoryType,
      imei: inventory.imei,
      simNumber: inventory.simNumber,
      simOperator: inventory.simOperator,
      secondarySimNumber: inventory.secondarySimNumber,
      secondarySimOperator: inventory.secondarySimOperator,
      deviceType: em.getReference(DeviceType, inventory.deviceType.id),
      assignType: inventory.assignType,
      client: inventory.client
        ? em.getReference(Client, inventory.client.id)
        : null,
      technician: inventory.technician
        ? em.getReference(Technician, inventory.technician.id)
        : null,
      password: inventory.password,
      ignitionWireConnected: inventory.ignitionWireConnected,
      airConditionWireConnected: inventory.airConditionWireConnected,
      analogSensor: inventory.analogSensor,
      status: inventory.status,
      reason: inventory.reason,
      ...(inventory.updatedBy
        ? { updatedBy: em.getReference(Client, inventory.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    try {
      await em.flush();
    } catch (error: unknown) {
      this.throwDuplicateImeiError(error);
    }
    await em.populate(existing, ["deviceType", "client", "technician"]);
    return existing;
  }

  private throwDuplicateImeiError(error: unknown): never {
    const current = error as {
      code?: string;
      errno?: number;
      message?: string;
      sqlMessage?: string;
    };
    const text = [current.sqlMessage, current.message]
      .filter(Boolean)
      .join(" ");

    const isDuplicate =
      current.code === "ER_DUP_ENTRY" ||
      current.errno === 1062 ||
      /duplicate entry/i.test(text);
    if (isDuplicate && /imei/i.test(text)) {
      const fieldError = new FormError();
      fieldError.field = "imei";
      fieldError.message = "IMEI already exists";
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        [fieldError],
      );
    }

    throw error;
  }

  async deleteAddInventory(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const inventory = await em.findOne(AddInventory, {
      externalId,
      isDeleted: false,
    });
    if (!inventory) {
      throw new AppError("Inventory not found", 404);
    }

    const now = new Date();
    inventory.isDeleted = true;
    inventory.deletedAt = now;
    inventory.updatedAt = now;
    if (deletedBy) {
      inventory.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
