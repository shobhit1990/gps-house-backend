/**
 * Process role, set via APP_RUNTIME_ROLE (mirrors dikshank-backend):
 *  - all               : HTTP API + Socket.IO + GPS listener + both GPS queue stages (single-process dev)
 *  - api               : HTTP API + Socket.IO only (fans out GPS updates received over Redis)
 *  - gps-worker        : TCP GPS listeners + realtime queue stage (no HTTP server)
 *  - gps-report-worker : history/report queue stage only (no HTTP server)
 */
export type AppRuntimeRole = 'all' | 'api' | 'gps-worker' | 'gps-report-worker';

const DEFAULT_RUNTIME_ROLE: AppRuntimeRole = 'all';

export function getRuntimeRole(): AppRuntimeRole {
  const value = (process.env.APP_RUNTIME_ROLE ?? DEFAULT_RUNTIME_ROLE).trim().toLowerCase();

  if (value === 'api' || value === 'gps-worker' || value === 'gps-report-worker' || value === 'all') {
    return value;
  }

  return DEFAULT_RUNTIME_ROLE;
}

export function shouldStartHttpServer(): boolean {
  const role = getRuntimeRole();
  return role === 'all' || role === 'api';
}

export function shouldStartGpsWorker(): boolean {
  const role = getRuntimeRole();
  return role === 'all' || role === 'gps-worker' || role === 'gps-report-worker';
}

/** Seeders run only on the primary API process in non-development environments. */
export function shouldRunSeeders(): boolean {
  const role = getRuntimeRole();
  return (role === 'all' || role === 'api') && process.env.NODE_ENV !== 'development';
}
