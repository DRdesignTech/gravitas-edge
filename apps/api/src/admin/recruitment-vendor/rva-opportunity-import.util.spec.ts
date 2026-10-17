import * as XLSX from 'xlsx';
import {
  deriveRvaTitle,
  findRvaHeaderRow,
  isBlankRvaRow,
  isRvaJobSheet,
  listRvaJobSheets,
  mapRvaHeadersToFields,
  parseRvaCategory,
  parseRvaCsvRows,
  parseRvaSheetRows,
} from './rva-opportunity-import.util';

function sheetFromRows(rows: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

describe('rva-opportunity-import.util', () => {
  describe('mapRvaHeadersToFields', () => {
    it('maps RVA headers to canonical fields', () => {
      const colMap = mapRvaHeadersToFields([
        'Title',
        'Role',
        'Sector',
        'Company',
        'Budget',
        'Location',
        'Experience',
        'Job ID',
        'Published Date',
      ]);
      expect(Object.values(colMap).sort()).toEqual(
        [
          'title',
          'role',
          'sector',
          'company',
          'budget',
          'location',
          'experienceText',
          'jobId',
          'publishedDate',
        ].sort(),
      );
    });

    it('maps opportunity/Vendor ID aliases to jobId', () => {
      expect(Object.values(mapRvaHeadersToFields(['Opportunity ID']))).toEqual(['jobId']);
      expect(Object.values(mapRvaHeadersToFields(['RVA ID']))).toEqual(['jobId']);
    });

    it('ignores unrecognized columns', () => {
      expect(Object.values(mapRvaHeadersToFields(['Priority', 'Owner']))).toEqual([]);
    });

    it('maps the canonical Recruitment Vendor Access Vault columns', () => {
      const colMap = mapRvaHeadersToFields([
        'S. No.',
        'Job ID',
        'Date',
        'Opportunity Type',
        'Organisation',
        'Industry',
        'Geography',
        'Vendor Requirement / Scope',
        'Eligibility / Vendor Criteria',
        'Deadline',
        'Contact Person',
        'Other Details',
        'How to Apply',
      ]);
      expect(Object.values(colMap)).toEqual([
        'serialNo',
        'jobId',
        'publishedDate',
        'title',
        'organization',
        'sector',
        'geography',
        'requirements',
        'eligibility',
        'expiryDate',
        'applicationContact',
        'otherDetails',
        'howToApply',
      ]);
    });
  });

  describe('findRvaHeaderRow', () => {
    it('detects a row with a title and a meta column', () => {
      const header = findRvaHeaderRow([
        ['Some report'],
        ['Title', 'Company', 'Location'],
        ['RFP for staffing', 'Acme', 'Dubai'],
      ]);
      expect(header?.index).toBe(1);
      expect(Object.values(header?.colMap ?? {}).sort()).toEqual(
        ['title', 'company', 'location'].sort(),
      );
    });

    it('returns null when there is no title column', () => {
      expect(findRvaHeaderRow([['Company', 'Location']])).toBeNull();
    });

    it('requires more than the title alone', () => {
      expect(findRvaHeaderRow([['Title', 'Description']])).toBeNull();
    });

    it('detects the canonical workbook header row with no Title column', () => {
      const header = findRvaHeaderRow([
        ['Recruitment Vendor Access'],
        [
          'S. No.',
          'Job ID',
          'Date',
          'Opportunity Type',
          'Organisation',
          'Industry',
          'Geography',
          'Vendor Requirement / Scope',
          'Eligibility / Vendor Criteria',
          'Deadline',
          'Contact Person',
          'Other Details',
          'How to Apply',
        ],
        [
          1,
          'RVA-1',
          '2026-01-05',
          'Staffing partner',
          'Acme',
          'Banking',
          'Dubai',
          'Supply 20 engineers',
          '5+ years',
          'Not mentioned',
          'hr@acme.com',
          'Ref 42',
          'Email your profile',
        ],
      ]);
      expect(header?.index).toBe(1);
      expect(Object.values(header?.colMap ?? {})).toContain('serialNo');
      expect(Object.values(header?.colMap ?? {})).toContain('howToApply');
    });

    it('treats the canonical sheet with a Not mentioned deadline as a job sheet', () => {
      const sheet = sheetFromRows([
        ['S. No.', 'Job ID', 'Vendor Requirement / Scope', 'Organisation', 'Deadline'],
        [1, 'RVA-2', 'Supply staff', 'Acme', 'Not mentioned'],
      ]);
      const rows = parseRvaSheetRows(sheet);
      expect(rows).toHaveLength(1);
      expect(rows[0].fields).toMatchObject({
        serialNo: '1',
        jobId: 'RVA-2',
        requirements: 'Supply staff',
        organization: 'Acme',
        expiryDate: 'Not mentioned',
      });
    });
  });

  describe('parseRvaSheetRows', () => {
    it('parses data rows beneath the header', () => {
      const sheet = sheetFromRows([
        ['Title', 'Company', 'Location', 'Job ID'],
        ['RFP staffing', 'Acme', 'Dubai', 'RVA-1'],
        [null, null, null, null],
      ]);
      const rows = parseRvaSheetRows(sheet);
      expect(rows).toHaveLength(2);
      expect(rows[0].fields).toMatchObject({
        title: 'RFP staffing',
        company: 'Acme',
        location: 'Dubai',
        jobId: 'RVA-1',
      });
    });
  });

  describe('isRvaJobSheet / listRvaJobSheets', () => {
    it('separates job sheets from meta sheets', () => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        sheetFromRows([
          ['Title', 'Company'],
          ['Role A', 'Acme'],
        ]),
        'Jobs',
      );
      XLSX.utils.book_append_sheet(
        workbook,
        sheetFromRows([['Note'], ['This is a read me']]),
        'Read Me',
      );

      expect(isRvaJobSheet(workbook, 'Jobs')).toBe(true);
      expect(isRvaJobSheet(workbook, 'Read Me')).toBe(false);
      expect(listRvaJobSheets(workbook)).toEqual({
        jobSheets: ['Jobs'],
        metaSheets: ['Read Me'],
      });
    });
  });

  describe('isBlankRvaRow', () => {
    it('treats a row with only administrative defaults as blank', () => {
      expect(isBlankRvaRow({ excelRow: 1, removalNote: false, fields: { status: 'DRAFT' } })).toBe(
        true,
      );
      expect(isBlankRvaRow({ excelRow: 1, removalNote: false, fields: { title: 'RFP' } })).toBe(
        false,
      );
    });
  });

  describe('parseRvaCsvRows', () => {
    it('parses a CSV buffer into mapped rows', async () => {
      const csv = ['Title,Company,Location,Job ID', 'RFP staffing,Acme,Dubai,RVA-9'].join('\n');
      const rows = await parseRvaCsvRows(Buffer.from(csv));
      expect(rows).toHaveLength(1);
      expect(rows[0].fields).toMatchObject({
        title: 'RFP staffing',
        company: 'Acme',
        jobId: 'RVA-9',
      });
    });
  });

  describe('deriveRvaTitle', () => {
    it('prefers an explicit title', () => {
      expect(deriveRvaTitle({ title: 'Staffing RFP', requirements: 'Ignore me' })).toBe(
        'Staffing RFP',
      );
    });

    it('falls back through requirements, organisation, role and sector', () => {
      expect(deriveRvaTitle({ requirements: 'Supply 20 engineers' })).toBe('Supply 20 engineers');
      expect(deriveRvaTitle({ organization: 'Acme' })).toBe('Acme');
      expect(deriveRvaTitle({ role: 'Recruiter' })).toBe('Recruiter');
      expect(deriveRvaTitle({ sector: 'Banking' })).toBe('Banking');
    });

    it('returns an empty string when nothing is present', () => {
      expect(deriveRvaTitle({})).toBe('');
    });

    it('truncates long values to the 300-char title budget', () => {
      const long = 'x'.repeat(350);
      expect(deriveRvaTitle({ requirements: long })).toHaveLength(300);
    });
  });

  describe('parseRvaCategory', () => {
    it('maps friendly and enum values onto RVA categories', () => {
      expect(parseRvaCategory('RFP / EOI / RFQ')).toBe('RFP_EOI_RFQ');
      expect(parseRvaCategory('staffing-rpo')).toBe('STAFFING_RPO');
      expect(parseRvaCategory('Executive Search')).toBe('EXECUTIVE_SEARCH');
      expect(parseRvaCategory('vendor enablement')).toBe('VENDOR_ENABLEMENT');
      expect(parseRvaCategory('VENDOR_ENABLEMENT')).toBe('VENDOR_ENABLEMENT');
      expect(parseRvaCategory('')).toBeNull();
      expect(parseRvaCategory(null)).toBeNull();
      expect(parseRvaCategory('something else')).toBeNull();
    });
  });
});
