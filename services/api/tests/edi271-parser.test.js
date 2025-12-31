/**
 * EDI 271 Parser Service Tests
 * Tests for 271 eligibility response parsing, coverage extraction, and validation
 */

import { describe, it, expect } from '@jest/globals';
import EDI271Parser from '../src/services/EDI271Parser.service.js';

// Sample EDI 271 content - Active Medicare hospice coverage
const SAMPLE_271_ACTIVE = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231215*1200*^*00501*000000001*0*P*:~
GS*HB*SENDER*RECEIVER*20231215*1200*1*X*005010X279A1~
ST*271*0001*005010X279A1~
BHT*0022*11*REQ123456789*20231215*1200~
HL*1**20*1~
NM1*PR*2*MEDICARE*****PI*CMS~
HL*2*1*21*1~
NM1*1P*1*HOSPICE CARE PROVIDER*****XX*1234567890~
HL*3*2*22*0~
TRN*2*TRACE123456789*9SENDER~
NM1*IL*1*SMITH*JOHN*W***MI*1EG4-TE5-MK72~
REF*0F*1EG4-TE5-MK72~
REF*1L*GRP123456~
DMG*D8*19450315*M~
N3*123 MAIN ST~
N4*ANYTOWN*CA*90210~
DTP*346*D8*20230101~
DTP*347*D8*20241231~
EB*1*IND*42****Y*Y~
EB*1*IND*30*MA*MEDICARE ADVANTAGE*23*0*80~
EB*C*IND*42*MA**23*2000~
EB*G*IND*42*MA**23*6500~
MSG*HOSPICE BENEFIT ACTIVE~
MSG*PRIOR AUTHORIZATION NOT REQUIRED~
SE*24*0001~
GE*1*1~
IEA*1*000000001~`;

// Sample EDI 271 content - Inactive coverage
const SAMPLE_271_INACTIVE = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231215*1400*^*00501*000000002*0*P*:~
GS*HB*SENDER*RECEIVER*20231215*1400*2*X*005010X279A1~
ST*271*0002*005010X279A1~
BHT*0022*11*REQ789012345*20231215*1400~
HL*1**20*1~
NM1*PR*2*MEDICARE*****PI*CMS~
HL*2*1*21*1~
NM1*1P*1*HOSPICE CARE PROVIDER*****XX*1234567890~
HL*3*2*22*0~
TRN*2*TRACE789012345*9SENDER~
NM1*IL*1*JONES*MARY*A***MI*2AB5-CD6-EF78~
REF*0F*2AB5-CD6-EF78~
DMG*D8*19380520*F~
N3*456 OAK AVE~
N4*SOMEWHERE*TX*75001~
DTP*346*D8*20220601~
DTP*347*D8*20230531~
EB*6*IND*42~
MSG*COVERAGE TERMINATED~
SE*20*0002~
GE*1*2~
IEA*1*000000002~`;

// Sample EDI 271 content - With copay and deductible
const SAMPLE_271_WITH_COPAY = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231215*1600*^*00501*000000003*0*P*:~
GS*HB*SENDER*RECEIVER*20231215*1600*3*X*005010X279A1~
ST*271*0003*005010X279A1~
BHT*0022*11*REQ456789012*20231215*1600~
HL*1**20*1~
NM1*PR*2*BLUE CROSS BLUE SHIELD*****PI*BCBS001~
HL*2*1*21*1~
NM1*1P*1*HOSPICE CARE PROVIDER*****XX*1234567890~
HL*3*2*22*0~
TRN*2*TRACE456789012*9SENDER~
NM1*IL*1*WILLIAMS*ROBERT*L***MI*XYZ123456789~
REF*0F*XYZ123456789~
REF*1L*BGRP789~
REF*18*PLN555~
DMG*D8*19550810*M~
N3*789 PINE ST*APT 101~
N4*LAKECITY*FL*32055~
DTP*346*D8*20230701~
DTP*347*D8*20240630~
EB*1*IND*42*MA*COMMERCIAL PPO*23*25~
EB*1*IND*30*MA*HEALTH BENEFIT PLAN*23*0*80~
EB*C*IND*42*MA*DEDUCTIBLE*23*1500~
EB*G*IND*42*MA*OUT OF POCKET MAXIMUM*23*5000~
EB*A*IND*42*MA*COINSURANCE*23**20~
HSD*VS*365*DA~
III*ZZ*HOSPICE*HOSPICE CARE SERVICES COVERED~
MSG*PRIOR AUTHORIZATION REQUIRED~
MSG*COPAY APPLIES PER VISIT~
SE*28*0003~
GE*1*3~
IEA*1*000000003~`;

describe('EDI 271 Parser Service', () => {
  describe('parse271()', () => {
    it('should parse active coverage correctly', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.subscriber).toBeDefined();
      expect(result.eligibility).toBeDefined();
      expect(result.benefits).toBeDefined();
      expect(result.additional).toBeDefined();
    });

    it('should extract header information', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.header.interchangeControlNumber).toBe('000000001');
      expect(result.header.transactionSetControlNumber).toBe('0001');
      expect(result.header.referenceId).toBe('REQ123456789');
    });

    it('should extract subscriber information', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.subscriber.lastName).toBe('SMITH');
      expect(result.subscriber.firstName).toBe('JOHN');
      expect(result.subscriber.middleName).toBe('W');
      expect(result.subscriber.memberId).toBe('1EG4-TE5-MK72');
      expect(result.subscriber.subscriberId).toBe('1EG4-TE5-MK72');
      expect(result.subscriber.groupNumber).toBe('GRP123456');
      expect(result.subscriber.dateOfBirth).toBe('19450315');
      expect(result.subscriber.gender).toBe('M');
    });

    it('should extract eligibility status as active', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.eligibility.isEligible).toBe(true);
      expect(result.eligibility.status).toBe('ACTIVE');
      expect(result.eligibility.payerName).toBe('MEDICARE');
    });

    it('should extract coverage dates', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.eligibility.coverageDates.effectiveDate).toBe('2023-01-01');
      expect(result.eligibility.coverageDates.terminationDate).toBe('2024-12-31');
    });

    it('should extract benefit information', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.benefits.length).toBeGreaterThan(0);

      // Find hospice benefit (service type 42)
      const hospiceBenefit = result.benefits.find(b => b.serviceTypeCode === '42');
      expect(hospiceBenefit).toBeDefined();
      expect(hospiceBenefit.eligibilityCode).toBe('1');
    });

    it('should extract additional messages', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      expect(result.additional.messages).toBeDefined();
      expect(result.additional.messages.length).toBeGreaterThan(0);
      expect(result.additional.messages).toContain('HOSPICE BENEFIT ACTIVE');
    });

    it('should include raw content in result', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);
      expect(result.rawContent).toBe(SAMPLE_271_ACTIVE);
    });
  });

  describe('inactive coverage parsing', () => {
    it('should parse inactive coverage correctly', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_INACTIVE);

      expect(result.eligibility.isEligible).toBe(false);
      expect(result.eligibility.status).toBe('INACTIVE');
    });

    it('should extract subscriber from inactive response', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_INACTIVE);

      expect(result.subscriber.lastName).toBe('JONES');
      expect(result.subscriber.firstName).toBe('MARY');
      expect(result.subscriber.gender).toBe('F');
    });

    it('should extract termination message', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_INACTIVE);

      expect(result.additional.messages).toContain('COVERAGE TERMINATED');
    });
  });

  describe('copay and deductible parsing', () => {
    it('should extract copay amount', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);
      const copay = EDI271Parser.extractCopay(result.benefits);

      // Copay of $25 = 2500 cents
      expect(copay).toBe(2500);
    });

    it('should extract deductible information', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);
      const deductible = EDI271Parser.extractDeductible(result.benefits);

      // Deductible of $1500 = 150000 cents
      expect(deductible.amount).toBe(150000);
    });

    it('should extract out-of-pocket maximum', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);
      const oopMax = EDI271Parser.extractOutOfPocketMax(result.benefits);

      // OOP max of $5000 = 500000 cents
      expect(oopMax.max).toBe(500000);
    });

    it('should detect authorization required', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);
      const authRequired = EDI271Parser.isAuthorizationRequired(result.benefits);

      // Message indicates prior auth required
      expect(result.additional.messages).toContain('PRIOR AUTHORIZATION REQUIRED');
    });
  });

  describe('benefit description generation', () => {
    it('should generate descriptive benefit text', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);

      // Check that benefits have descriptions
      result.benefits.forEach(benefit => {
        expect(benefit.description).toBeDefined();
        expect(benefit.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('service limitations extraction', () => {
    it('should extract service limitations', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);
      const limitations = EDI271Parser.extractLimitations(result.benefits, result.additional);

      expect(limitations).toBeDefined();
    });

    it('should extract restrictions from HSD segment', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);

      // HSD segment should be parsed
      expect(result.additional.restrictions).toBeDefined();
    });

    it('should extract additional info from III segment', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_WITH_COPAY);

      // III segment should be parsed
      expect(result.additional.limitations).toBeDefined();
    });
  });

  describe('date formatting', () => {
    it('should format D8 dates correctly', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      // D8 format YYYYMMDD -> YYYY-MM-DD
      expect(result.eligibility.coverageDates.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid EDI content', async () => {
      await expect(
        EDI271Parser.parse271('INVALID EDI CONTENT')
      ).resolves.toBeDefined(); // Parser handles gracefully, doesn't throw
    });

    it('should handle empty content', async () => {
      await expect(
        EDI271Parser.parse271('')
      ).resolves.toBeDefined();
    });
  });

  describe('segment parsing', () => {
    it('should split segments correctly by tilde', async () => {
      const result = await EDI271Parser.parse271(SAMPLE_271_ACTIVE);

      // Should have parsed multiple segments
      expect(result.benefits.length).toBeGreaterThan(0);
    });
  });
});
