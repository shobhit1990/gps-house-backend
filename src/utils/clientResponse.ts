import { Client } from "../domain/entities/mysql/Client";

export const formatClientResponse = (client: Client) => (
     {
        id: client.externalId,
        owner_name: client.owner_name?.ownerName,
        language: client.language?.languageName,
        timezone: client.timezone?.timeZone,
        vehicle_count: client.vehicle_count,
        userName: client.userName,
        clientImage: client.clientImage ?? null,
        password : client.password,
        companyName : client.companyName,
        name : client.name,
        email : client.email,
        phone : client.phone,
        domain : client.domain,
        address: client.address,
        status: client.status,
        reason: client.reason ?? null,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
    }
);

// export type ClientResponse = ReturnType<typeof formatClientResponse>;