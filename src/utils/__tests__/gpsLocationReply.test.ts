import { isNoLocationReply, parseGpsLocationReply } from '../gpsLocationReply';

describe('parseGpsLocationReply', () => {
  it('parses WHERE# style reply', () => {
    expect(
      parseGpsLocationReply('Lat:N28.612345,Lon:E77.123456,Course:45.00,Speed:12.50Km/h,DateTime:2026-10-09 10:00:00'),
    ).toEqual({ latitude: 28.612345, longitude: 77.123456, speed: 12.5, direction: 45 });
  });

  it('parses reply with prefix and southern/western hemisphere', () => {
    expect(parseGpsLocationReply('Current position!Lat:S22.5,Lon:W43.2,Speed:0')).toEqual({
      latitude: -22.5,
      longitude: -43.2,
      speed: 0,
      direction: undefined,
    });
  });

  it('parses google maps link reply', () => {
    expect(parseGpsLocationReply('http://maps.google.com/maps?q=N28.612345,E77.123456')).toMatchObject({
      latitude: 28.612345,
      longitude: 77.123456,
    });
  });

  it('ignores non-location replies and zero coordinates', () => {
    expect(parseGpsLocationReply('TIMER OK')).toBeNull();
    expect(parseGpsLocationReply('Lat:N0.000000,Lon:E0.000000')).toBeNull();
    expect(parseGpsLocationReply('')).toBeNull();
  });

  it('parses FT112 reply with S: speed and ACC state', () => {
    expect(
      parseGpsLocationReply('Lat:N26.427052,Lon:E80.297531,S:12.50km/h,T:2026-10-09 21:33:54,V:13.4V,ACC:OFF'),
    ).toEqual({ latitude: 26.427052, longitude: 80.297531, speed: 12.5, direction: undefined, ignitionStatus: false });
  });

  it('detects FT112 no-fix reply', () => {
    const text = 'No location;T:2026-10-09 21:34:55,V:13.2V,ACC:OFF';
    expect(isNoLocationReply(text)).toBe(true);
    expect(parseGpsLocationReply(text)).toBeNull();
    expect(isNoLocationReply('Lat:N26.4,Lon:E80.2')).toBe(false);
  });
});
