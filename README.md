# gps-house-backend

## MySQL menu seed

The owner sidebar menu is stored in the `menu_items` table. After the MySQL schema
has been created, run the idempotent seeder with:

```sh
npm run seed:mysql
```

This creates or refreshes the single Owner menu entry.

## User login

Common authentication routes are mounted under `/api/v1/user`:

- `POST /login` accepts exactly one of `userName`, `email`, or `contactNumber`,
  plus `password`. It returns user details, a 15-minute JWT, and a 30-day
  refresh token.
- `POST /refresh` accepts `refreshToken` and rotates both tokens.
- `POST /logout` accepts `refreshToken` and revokes it.

Set `JWT_SECRET` before serving login requests. The JWT includes the account's
`userType`. Passwords are bcrypt-hashed, with legacy scrypt hashes upgraded
after a successful login. OTP columns are reserved in the users schema; OTP
delivery endpoints are not enabled because no delivery provider is configured.

Existing Client, Transporter, and Technician records are copied into `users`.
Their legacy tables remain for existing foreign-key compatibility, and the
role-specific services retain their dual-write behavior. The Group table
remains separate and Group Users reference it through `group_id`. The standalone
`/register` route is not enabled. `POST /api/v1/user/` is available to
authenticated users for creating users.

Protected API routes require a valid JWT and active account, but API access is
not restricted by `userType`. Login, token refresh/revocation, and health
checks are public routes; refresh and revocation require the refresh-token
secret.

## Other API access

Menu, master-data, and other API routes are available without role-based
restrictions.

## Vehicle GPS tracking (listener, live, history)

Ported from dikshank-backend with the same pipeline:

```
GPS device ──TCP (GT800N/GT801N)──▶ VehicleGpsListener ──▶ Mongo gps_realtime_queue (latest per IMEI)
                                                       └──▶ Mongo gps_report_queue   (every point)
gps_realtime_queue ─▶ VehicleGpsDeviceService ─▶ device live columns (MySQL) ─▶ Redis pub/sub ─▶ Socket.IO room
gps_report_queue   ─▶ VehicleGpsTrackingService ─▶ Mongo vehicleGpsTracking_<month>_<year> (+ _latest), vehicleGpsStatus_<m>_<y>
```

- A device may log in only when its IMEI is a registered, **active** `device` that is assigned to a
  non-deleted, non-inactive vehicle (`add_vehicle.device`). Mappings are cached in Redis and refreshed every 5 minutes
  (`VEHICLE_GPS_IMEI_CACHE_REFRESH_MS`); a new assignment can take up to that long, or 5 minutes of negative cache, to be accepted.
- History stores moving points only (speed > 0). The live position also updates while parked.
- Redis is required when GPS is enabled.

### Running

- Development: `APP_RUNTIME_ROLE=all` (default) runs the API, Socket.IO, listeners and both queue stages in one process.
- Production: `npm run build && pm2 start ecosystem.config.js` starts `api`, `gps-worker` and `gps-report-worker`.
  Open the TCP ports in `GPS_LISTENERS` (default 5001/5002) on the firewall and point devices at them.

### API (JWT required)

- `GET /api/v1/vehicleLiveTracking?clientId=&transporterId=` — current position snapshot with `gpsStatus`
  (`running | idle | stop | inactive | no-gps`).
- `GET /api/v1/vehicleHistoryTracking/vehicles` — vehicles with a GPS device.
- `GET /api/v1/vehicleHistoryTracking/history?vehicleId=&from=&to=&limit=` — ordered points and stats.

### Socket.IO

Connect with `auth: { token: "<access token>" }`, emit `join-vehicle-live-tracking`, and listen for
`vehicle.location.updated`. The room is namespaced with `APP_CLIENT_NAMESPACE`.
