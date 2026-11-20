export enum Roles {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CLIENT = "CLIENT",
  TECHNICIAN = "TECHNICIAN",
  TRANSPORTER = "TRANSPORTER",
  USER = "USER",
}

export const RoleNameMap: Record<Roles, string> = {
  [Roles.SUPER_ADMIN]: "Super Administrator",
  [Roles.ADMIN]: "Administrator",
  [Roles.CLIENT]: "Client",
  [Roles.TECHNICIAN]: "Technician",
  [Roles.TRANSPORTER]: "Transporter",
  [Roles.USER]: "User",
};
