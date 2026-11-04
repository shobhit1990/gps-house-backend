import { Migration } from "@mikro-orm/migrations";
import bcrypt from "bcrypt";

interface LegacyClient {
  id: number;
  external_id: string;
  owner_name: number;
  user_name: string;
  password: string;
  company_name: string;
  email: string | null;
  name: string | null;
  phone: string | number | null;
  address: string | null;
  language: number;
  domain: string | null;
  vehicle_count: string | null;
  timezone: number;
  client_image: string | object | null;
  imei_number: string | null;
  created_by_id: number | null;
  updated_by_id: number | null;
  status: string;
  reason: string | null;
  is_deleted: number;
  deleted_by_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  session_version: number;
}

interface LegacyTransporter {
  id: number;
  external_id: string;
  user_name: string;
  password: string;
  company_name: string;
  client: number;
  language: number;
  timezone: number;
  inactive_time: number;
  email: string | null;
  name: string | null;
  phone: string | number | null;
  address: string | null;
  subscription_start_date: Date | null;
  subscription_due_date: Date | null;
  subscription_extend_date: Date | null;
  subscription_expiry_count: string | null;
  maximum_radius_for_nearest_poi: string | null;
  minimum_distance_for_address: string | null;
  data_restriction: string | null;
  created_by_id: number | null;
  updated_by_id: number | null;
  status: string;
  reason: string | null;
  is_deleted: number;
  deleted_by_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  session_version: number;
}

interface LegacyTechnician {
  id: number;
  external_id: string;
  user_name: string;
  password: string;
  company_name: string;
  name: string | null;
  email: string | null;
  phone: string | number | null;
  address: string | null;
  timezone: number;
  client: number;
  created_by_id: number | null;
  updated_by_id: number | null;
  status: string | null;
  reason: string | null;
  is_deleted: number;
  deleted_by_id: number | null;
  created_at: Date;
  updated_at: Date;
}

const authColumns: Array<[string, string]> = [
  ["otp_hash", "VARCHAR(60) NULL"],
  ["otp_expires_at", "DATETIME NULL"],
  ["otp_sent_at", "DATETIME NULL"],
  ["otp_attempts", "INT NOT NULL DEFAULT 0"],
  ["refresh_token_hash", "VARCHAR(64) NULL"],
  ["refresh_token_expires_at", "DATETIME NULL"],
];

export class Migration20261104010000 extends Migration {
  override async up(): Promise<void> {
    const columns = (await this.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    )) as Array<{ COLUMN_NAME: string }>;
    const existing = new Set(columns.map(({ COLUMN_NAME }) => COLUMN_NAME));
    const missing = authColumns.filter(([name]) => !existing.has(name));
    if (missing.length) {
      await this.execute(
        `ALTER TABLE users ${missing
          .map(([name, definition]) => `ADD COLUMN \`${name}\` ${definition}`)
          .join(", ")}`,
      );
    }

    const clients = (await this.execute(
      "SELECT * FROM client ORDER BY id",
    )) as LegacyClient[];
    for (const row of clients) {
      const password = await this.migratePassword(row.password);
      await this.insertIfMissing({
        external_id: row.external_id,
        user_name: row.user_name,
        password,
        group_id: null,
        timezone_id: row.timezone,
        owner_id: row.owner_name,
        language_id: row.language,
        client_id: null,
        company_name: row.company_name,
        contact_person_name: row.name,
        email: row.email,
        phone: row.phone === null ? null : String(row.phone),
        company_address: row.address,
        address: row.address,
        domain: row.domain,
        vehicle_count: row.vehicle_count,
        max_vehicle_count: null,
        allow_all_vehicle_list: null,
        client_image:
          row.client_image === null ? null : JSON.stringify(row.client_image),
        inactive_time: null,
        subscription_start_date: null,
        subscription_due_date: null,
        subscription_extend_date: null,
        subscription_expiry_count: null,
        maximum_radius_for_nearest_poi: null,
        minimum_distance_for_address: null,
        data_restriction: null,
        overwrite_subscription: null,
        vehicle_inactive_after_expiry: null,
        session_version: row.session_version,
        user_type: "CLIENT",
        imei_number: row.imei_number,
        data_restriction_days: null,
        is_school_user: 0,
        status: row.status,
        reason: row.reason,
        is_deleted: row.is_deleted,
        created_by_id: row.created_by_id,
        updated_by_id: row.updated_by_id,
        deleted_by_id: row.deleted_by_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        otp_hash: null,
        otp_expires_at: null,
        otp_sent_at: null,
        otp_attempts: 0,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
      });
      if (password !== row.password) {
        await this.execute("UPDATE client SET password = ? WHERE id = ?", [
          password,
          row.id,
        ]);
      }
    }

    const transporters = (await this.execute(
      "SELECT * FROM add_transporter ORDER BY id",
    )) as LegacyTransporter[];
    for (const row of transporters) {
      const password = await this.migratePassword(row.password);
      const clientExternalId = await this.findLegacyClientExternalId(
        row.client,
      );
      const clientUserId = await this.findUserIdByExternalId(clientExternalId);
      await this.insertIfMissing({
        external_id: row.external_id,
        user_name: row.user_name,
        password,
        group_id: null,
        timezone_id: row.timezone,
        owner_id: null,
        language_id: row.language,
        client_id: clientUserId,
        company_name: row.company_name,
        contact_person_name: row.name,
        email: row.email,
        phone: row.phone === null ? null : String(row.phone),
        company_address: row.address,
        address: row.address,
        domain: null,
        vehicle_count: null,
        max_vehicle_count: null,
        allow_all_vehicle_list: null,
        client_image: null,
        inactive_time: row.inactive_time,
        subscription_start_date: row.subscription_start_date,
        subscription_due_date: row.subscription_due_date,
        subscription_extend_date: row.subscription_extend_date,
        subscription_expiry_count: row.subscription_expiry_count,
        maximum_radius_for_nearest_poi: row.maximum_radius_for_nearest_poi,
        minimum_distance_for_address: row.minimum_distance_for_address,
        data_restriction: row.data_restriction,
        overwrite_subscription: null,
        vehicle_inactive_after_expiry: null,
        session_version: row.session_version,
        user_type: "TRANSPORTER",
        imei_number: null,
        data_restriction_days: null,
        is_school_user: 0,
        status: row.status,
        reason: row.reason,
        is_deleted: row.is_deleted,
        created_by_id: row.created_by_id,
        updated_by_id: row.updated_by_id,
        deleted_by_id: row.deleted_by_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        otp_hash: null,
        otp_expires_at: null,
        otp_sent_at: null,
        otp_attempts: 0,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
      });
      if (password !== row.password) {
        await this.execute(
          "UPDATE add_transporter SET password = ? WHERE id = ?",
          [password, row.id],
        );
      }
    }

    const technicians = (await this.execute(
      "SELECT * FROM add_technician ORDER BY id",
    )) as LegacyTechnician[];
    for (const row of technicians) {
      const password = await this.migratePassword(row.password);
      const clientExternalId = await this.findLegacyClientExternalId(
        row.client,
      );
      const clientUserId = await this.findUserIdByExternalId(clientExternalId);
      await this.insertIfMissing({
        external_id: row.external_id,
        user_name: row.user_name,
        password,
        group_id: null,
        timezone_id: row.timezone,
        owner_id: null,
        language_id: null,
        client_id: clientUserId,
        company_name: row.company_name,
        contact_person_name: row.name,
        email: row.email,
        phone: row.phone === null ? null : String(row.phone),
        company_address: row.address,
        address: row.address,
        domain: null,
        vehicle_count: null,
        max_vehicle_count: null,
        allow_all_vehicle_list: null,
        client_image: null,
        inactive_time: null,
        subscription_start_date: null,
        subscription_due_date: null,
        subscription_extend_date: null,
        subscription_expiry_count: null,
        maximum_radius_for_nearest_poi: null,
        minimum_distance_for_address: null,
        data_restriction: null,
        overwrite_subscription: null,
        vehicle_inactive_after_expiry: null,
        session_version: 0,
        user_type: "TECHNICIAN",
        imei_number: null,
        data_restriction_days: null,
        is_school_user: 0,
        status: row.status ?? "active",
        reason: row.reason,
        is_deleted: row.is_deleted,
        created_by_id: row.created_by_id,
        updated_by_id: row.updated_by_id,
        deleted_by_id: row.deleted_by_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: null,
        otp_hash: null,
        otp_expires_at: null,
        otp_sent_at: null,
        otp_attempts: 0,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
      });
      if (password !== row.password) {
        await this.execute(
          "UPDATE add_technician SET password = ? WHERE id = ?",
          [password, row.id],
        );
      }
    }
  }

  override down(): void {
    // User records and credentials were copied here; rollback must not delete them.
  }

  private async migratePassword(password: string): Promise<string> {
    if (/^\$2[aby]\$\d{2}\$/.test(password)) return password;
    if (/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(password)) return password;
    return bcrypt.hash(password, 12);
  }

  private async insertIfMissing(
    record: Record<string, string | number | Date | null>,
  ): Promise<void> {
    const existing = await this.execute(
      "SELECT id FROM users WHERE external_id = ?",
      [record.external_id],
    );
    if (existing.length) return;

    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    const identifiers = columns.map((column) => `\`${column}\``).join(", ");
    await this.execute(
      `INSERT INTO users (${identifiers}) VALUES (${placeholders})`,
      columns.map((column) => record[column]),
    );
  }

  private async findLegacyClientExternalId(id: number): Promise<string> {
    const rows = (await this.execute(
      "SELECT external_id FROM client WHERE id = ?",
      [id],
    )) as Array<{ external_id: string }>;
    if (!rows[0]) {
      throw new Error(
        `Cannot migrate user profile: legacy client ${id} does not exist`,
      );
    }
    return rows[0].external_id;
  }

  private async findUserIdByExternalId(externalId: string): Promise<number> {
    const rows = (await this.execute(
      "SELECT id FROM users WHERE external_id = ?",
      [externalId],
    )) as Array<{ id: number }>;
    if (!rows[0]) {
      throw new Error(
        `Cannot migrate user profile: unified client ${externalId} is missing`,
      );
    }
    return rows[0].id;
  }
}
