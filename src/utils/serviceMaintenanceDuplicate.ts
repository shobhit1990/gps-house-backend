export function getServiceMaintenanceDuplicateKey(
  vehicleExternalId: string,
  serviceName: string,
): string {
  return `${vehicleExternalId}:${serviceName.trim().toLocaleLowerCase("en-US")}`;
}
