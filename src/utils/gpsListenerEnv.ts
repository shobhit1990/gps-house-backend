import { GpsListenerProtocol } from '../domain/enums/GpsListenerProtocol';

/** Parsed GPS_LISTENERS env entry: name:port:protocol */
export type ParsedGpsListenerEnv = {
  key: string;
  port: number;
  protocol: GpsListenerProtocol;
};

const SUPPORTED_PROTOCOLS = new Set<string>(Object.values(GpsListenerProtocol));

function parseProtocol(value: string): GpsListenerProtocol | null {
  const normalized = value.trim().toUpperCase();
  if (!SUPPORTED_PROTOCOLS.has(normalized)) return null;
  return normalized as GpsListenerProtocol;
}

/** Reads GPS_LISTENERS (name:port:protocol, comma-separated) from env. */
export function parseGpsListenersFromEnv(
  listenersEnv = process.env.GPS_LISTENERS,
  fallbackPort = process.env.GPS_LISTENER_PORT,
): ParsedGpsListenerEnv[] {
  if (!listenersEnv?.trim()) {
    const port = Number(fallbackPort || 12345);
    if (!Number.isFinite(port) || port < 1 || port > 65535) return [];
    return [
      {
        key: 'GT800N-Default',
        port,
        protocol: GpsListenerProtocol.Gt800n,
      },
    ];
  }

  const configs: ParsedGpsListenerEnv[] = [];
  for (const listenerString of listenersEnv.split(',')) {
    const parts = listenerString.split(':');
    if (parts.length < 3) continue;

    const [key, portStr, protocolRaw] = parts;
    const port = Number.parseInt(portStr, 10);
    const protocol = parseProtocol(protocolRaw);
    const trimmedKey = key.trim();

    if (!trimmedKey || !protocol || !Number.isFinite(port) || port < 1 || port > 65535) {
      continue;
    }

    configs.push({ key: trimmedKey, port, protocol });
  }

  return configs;
}

export function isValidGpsListenerKey(key: string | undefined | null): boolean {
  if (!key?.trim()) return true;
  return parseGpsListenersFromEnv().some((item) => item.key === key.trim());
}
