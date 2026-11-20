const DEFAULT_CLIENT_NAMESPACE = 'default';
const CLIENT_NAMESPACE_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Site-scoped namespace for Redis keys, Socket.IO rooms, and Redis pub/sub channels.
 * Set APP_CLIENT_NAMESPACE uniquely per co-hosted deployment.
 */
export function getClientNamespace(): string {
  const namespace = process.env.APP_CLIENT_NAMESPACE?.trim();
  return namespace || DEFAULT_CLIENT_NAMESPACE;
}

export function validateClientNamespace(): string {
  const namespace = getClientNamespace();

  if (!CLIENT_NAMESPACE_PATTERN.test(namespace)) {
    throw new Error(
      'APP_CLIENT_NAMESPACE must contain only letters, numbers, underscores, and hyphens',
    );
  }

  return namespace;
}

/** Prefixes Redis keys with the active client namespace. */
export function redisKey(...parts: Array<string | number | undefined | null>): string {
  const cleanParts = parts
    .filter((part): part is string | number => part !== undefined && part !== null && String(part) !== '')
    .map((part) => String(part));

  return [getClientNamespace(), ...cleanParts].join(':');
}

/** GPS-specific Redis keys under the same client namespace. */
export function gpsRedisKey(...parts: Array<string | number | undefined | null>): string {
  return redisKey('gps', ...parts);
}

/** Prefixes Socket.IO room names so co-hosted sites do not share broadcasts. */
export function socketRoom(baseRoom: string): string {
  return `${getClientNamespace()}:${baseRoom}`;
}

/** Prefixes Redis pub/sub channels used to bridge workers to the API socket process. */
export function socketRedisChannel(channel: string): string {
  return `${getClientNamespace()}:${channel}`;
}
