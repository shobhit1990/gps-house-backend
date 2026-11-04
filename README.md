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
