import { Request } from "express";

export interface CustomRequest extends Request {
  ServerConfigurationId: string;
  userId: number;
  ExternalId: string;
  userExternalId: string;
  roleId?: number
  roleCode?: string
  state_id: string
  /** True when the JWT belongs to a dealer (mobile OTP login), not a web user. */
  isDealer?: boolean
  /**
   * After `authenticate({ requireJWT: true })`: true if JWT is mobile-issued (`tokenChannel` / `mobile` claims)
   * or request sent `x-app-channel: native` (native shell using a web token). Use for API branching.
   */
  isMobileSession?: boolean;
}
