import {
  canonicalGpsImei,
  decodeGt06LoginImei,
  gpsImeiLookupVariants,
  normalizeGpsImei,
} from '../gpsImei';

describe('gpsImei', () => {
  describe('canonicalGpsImei', () => {
    it('strips leading 0 from 16-digit BCD IMEI', () => {
      expect(canonicalGpsImei('0869689045311966')).toBe('869689045311966');
    });

    it('keeps 15-digit IMEI unchanged', () => {
      expect(canonicalGpsImei('869689045311966')).toBe('869689045311966');
    });

    it('strips multiple leading zeros when length exceeds 15', () => {
      expect(canonicalGpsImei('00869689045311966')).toBe('869689045311966');
    });
  });

  describe('gpsImeiLookupVariants', () => {
    it('includes both 15- and 16-digit forms for BCD-padded IMEI', () => {
      const variants = gpsImeiLookupVariants('0869689045311966');
      expect(variants).toContain('869689045311966');
      expect(variants).toContain('0869689045311966');
    });

    it('includes 0-prefixed variant for 15-digit IMEI', () => {
      const variants = gpsImeiLookupVariants('869689045311966');
      expect(variants).toContain('869689045311966');
      expect(variants).toContain('0869689045311966');
    });
  });

  describe('decodeGt06LoginImei', () => {
    it('decodes IMEI from standard GT06 login packet hex', () => {
      // 7878 + len + 01 + 8 BCD bytes (0869689045311966) + serial...
      const packet =
        '7878' + '00' + '01' + '0869689045311966' + '0001' + '0D0A';
      expect(decodeGt06LoginImei(packet)).toBe('869689045311966');
    });
  });

  describe('normalizeGpsImei', () => {
    it('extracts digits only', () => {
      expect(normalizeGpsImei(' 86-968-9045311966 ')).toBe('869689045311966');
    });
  });
});
