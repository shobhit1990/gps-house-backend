export enum UserType {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
  CLIENT = "CLIENT",
  TRANSPORTER = "TRANSPORTER",
  TECHNICIAN = "TECHNICIAN",
}

/** Types an API caller may assign. Platform admins come from the role row. */
export const ASSIGNABLE_USER_TYPES = [
  UserType.USER,
  UserType.CLIENT,
  UserType.TRANSPORTER,
  UserType.TECHNICIAN,
] as const;
