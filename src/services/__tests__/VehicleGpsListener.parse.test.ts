import { VehicleGpsListener } from '../VehicleGpsListener';

// Example packets from the FT12 BSJ V3 and Concox GT800 (V2.9) protocol documents (CRLF stripped).
const hex = (s: string) => s.replace(/\s+/g, '').toUpperCase();

describe('VehicleGpsListener packet parsing', () => {
  const listener = new VehicleGpsListener(
    { name: 'test', port: 0, protocol: 'GT800N', enabled: true },
    {} as any,
    {} as any,
  ) as any;

  it('parses 0x22 location with UTC time and serial before CRC', () => {
    const { locationData, serialNumber } = listener.parseLocationPacket(
      hex('78 78 22 22 12 0A 12 02 2A 20 C0 02 78 37 7C 0C 44 52 90 00 00 00 01 CC 00 25 54 00 27 0A 00 05 00 00 02 3E 44'),
    );
    expect(locationData.locationTime.toISOString()).toBe('2018-10-18T02:42:32.000Z');
    expect(locationData.latitude).toBeCloseTo(23.0183, 3);
    expect(locationData.longitude).toBeCloseTo(114.3356, 3);
    expect(locationData.ignitionStatus).toBe(false);
    expect(locationData.gpsRealTime).toBe('00');
    expect(serialNumber).toBe('0002');
  });

  it('parses FT12 0x26 alarm with LBS length byte and correct terminal-info bits', () => {
    const { locationData, serialNumber, alarmCode } = listener.parseAlarmPacket(
      hex('78 78 25 26 11 02 04 06 11 39 C5 02 6D DE C0 0C 3B FE E6 23 14 49 08 01 CC 00 26 2C 00 0E BA 54 00 03 02 02 00 6B FB EE'),
    );
    expect(locationData.locationTime.toISOString()).toBe('2017-02-04T06:17:57.000Z');
    expect(locationData.mcc).toBe('460');
    expect(locationData.lac).toBe(String(0x262c));
    expect(locationData.cellId).toBe(String(0x000eba));
    // 0x54 = 0101 0100 -> GPS positioned, power-off alarm, charging, ACC low
    expect(locationData.ignitionStatus).toBe(false);
    expect(alarmCode).toBe('02');
    expect(serialNumber).toBe('006B');
  });

  it('reads ACC high from Concox 0x26 alarm terminal info', () => {
    const { locationData, alarmCode } = listener.parseAlarmPacket(
      hex('78 78 25 26 12 03 0C 06 38 16 C3 02 6C 10 54 0C 38 C9 70 01 44 03 09 01 CC 00 28 66 00 0E EE 0C 06 04 03 02 00 0D A2 DB'),
    );
    expect(locationData.mcc).toBe('460');
    expect(locationData.cellId).toBe(String(0x000eee));
    // 0x0C = 0000 1100 -> vibration alarm bits, charging, ACC low
    expect(locationData.ignitionStatus).toBe(false);
    expect(alarmCode).toBe('03');
  });

  it('builds location ACK with a valid CRC (protocol doc: 78 78 05 22 C4 C0 4F CC)', () => {
    expect(listener.buildLocationResponse('C4C0', 0x22).toString('hex').toUpperCase()).toBe('7878052' + '2C4C04FCC0D0A');
  });
});
