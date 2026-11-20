/**
 * PM2 process layout (same split as dikshank-backend):
 *   gps-house-api               HTTP API + Socket.IO, relays GPS updates from Redis to the map
 *   gps-house-gps-worker        TCP GPS listeners + realtime queue stage (Device live position)
 *   gps-house-gps-report-worker history queue stage (Mongo vehicleGpsTracking_<m>_<yyyy>)
 *
 * Build first (`npm run build`), then: `pm2 start ecosystem.config.js`
 * Values here override .env; DB/Redis/JWT settings still come from .env.
 */
const NAMESPACE = process.env.APP_CLIENT_NAMESPACE || 'gps_house';
const GPS_LISTENERS = process.env.GPS_LISTENERS || 'GT800N-1:5001:GT800N,GT801N-2:5002:GT801N';

function createApp(name, env) {
  return {
    name,
    script: 'dist/server.js',
    instances: env._instances ?? 1,
    exec_mode: 'fork',
    node_args: env._nodeArgs || '--max-old-space-size=1536',
    env: Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('_'))),
  };
}

module.exports = {
  apps: [
    createApp('gps-house-api', {
      NODE_ENV: 'production',
      APP_RUNTIME_ROLE: 'api',
      APP_CLIENT_NAMESPACE: NAMESPACE,
      VEHICLE_GPS_ENABLED: 'false',
      GPS_LISTENER_ENABLED: 'false',
    }),
    createApp('gps-house-gps-worker', {
      NODE_ENV: 'production',
      APP_RUNTIME_ROLE: 'gps-worker',
      APP_CLIENT_NAMESPACE: NAMESPACE,
      VEHICLE_GPS_ENABLED: 'true',
      GPS_LISTENER_ENABLED: 'true',
      GPS_LISTENERS,
      GPS_LISTENER_MAX_CONNECTIONS: '1000',
      GPS_REALTIME_BATCH_SIZE: '500',
      GPS_REALTIME_INTERVAL_MS: '250',
      GPS_REALTIME_PROCESSOR_ENABLED: 'true',
      GPS_REPORT_PROCESSOR_ENABLED: 'false',
      GPS_QUEUE_LOCK_MS: '180000',
    }),
    createApp('gps-house-gps-report-worker', {
      // Several instances are safe: report items are claimed atomically per batch.
      _instances: 3,
      NODE_ENV: 'production',
      APP_RUNTIME_ROLE: 'gps-report-worker',
      APP_CLIENT_NAMESPACE: NAMESPACE,
      VEHICLE_GPS_ENABLED: 'true',
      GPS_LISTENER_ENABLED: 'false',
      GPS_REALTIME_PROCESSOR_ENABLED: 'false',
      GPS_REPORT_PROCESSOR_ENABLED: 'true',
      GPS_REPORT_BATCH_SIZE: '500',
      GPS_REPORT_INTERVAL_MS: '1000',
      GPS_REPORT_WORKER_COUNT: '10',
      GPS_QUEUE_LOCK_MS: '180000',
    }),
  ],
};
