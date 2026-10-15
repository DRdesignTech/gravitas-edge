import * as XLSX from 'xlsx';
import {
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
      expect(Object.values(mapRvaHeadersToFields(['Serial No', 'Priority']))).toEqual([]);
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
