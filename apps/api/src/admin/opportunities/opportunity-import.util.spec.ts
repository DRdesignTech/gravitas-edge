import { join } from 'path';
import * as XLSX from 'xlsx';
import {
  findHeaderRow,
  mapHeadersToFields,
  normalizeHeaderKey,
  parseDateCell,
  parseExperience,
  parseSheetRows,
  selectSheetName,
} from './opportunity-import.util';

describe('opportunity-import.util', () => {
  describe('normalizeHeaderKey', () => {
    it('strips parenthetical suffixes and punctuation', () => {
      expect(normalizeHeaderKey('Role (B)')).toBe('role');
      expect(normalizeHeaderKey('S. No.')).toBe('sno');
      expect(normalizeHeaderKey('Salary (E)')).toBe('salary');
      expect(normalizeHeaderKey('min_experience')).toBe('minexperience');
    });
  });

  describe('mapHeadersToFields', () => {
    it('maps client workbook headers to canonical fields', () => {
      const colMap = mapHeadersToFields([
        'S. No.',
        'Date',
        'Role (B)',
        'Sector (C)',
        'Salary (E)',
        'Location (F)',
        'Experience (G)',
      ]);
      expect(Object.values(colMap).sort()).toEqual(
        ['title', 'industry', 'salary', 'location', 'experienceText', 'date', 'externalRef'].sort(),
      );
    });
  });

  describe('parseDateCell', () => {
    it('handles Excel serial numbers exactly', () => {
      const parsed = parseDateCell(46026);
      expect(parsed.date?.toISOString().slice(0, 10)).toBe('2026-01-04');
    });

    it('normalizes month-name strings to the 1st of the month', () => {
      expect(parseDateCell('August')?.date?.toISOString().slice(0, 10)).toBe('2026-08-01');
      expect(parseDateCell('September 2026')?.date?.toISOString().slice(0, 10)).toBe('2026-09-01');
    });

    it('parses day-first date strings in multiple separators', () => {
      expect(parseDateCell('01-04-26')?.date?.toISOString().slice(0, 10)).toBe('2026-04-01');
      expect(parseDateCell('16/05/26')?.date?.toISOString().slice(0, 10)).toBe('2026-05-16');
      expect(parseDateCell('2026-12-31')?.date?.toISOString().slice(0, 10)).toBe('2026-12-31');
    });

    it('parses Excel serial numbers stored as text', () => {
      expect(parseDateCell('46062')?.date?.toISOString().slice(0, 10)).toBe('2026-02-09');
    });

    it('treats NA / empty as no date', () => {
      expect(parseDateCell('NA')).toEqual({ date: null, error: null });
      expect(parseDateCell(null)).toEqual({ date: null, error: null });
      expect(parseDateCell('')).toEqual({ date: null, error: null });
    });

    it('flags unparseable dates', () => {
      const res = parseDateCell('sometime next year');
      expect(res.error).toBeTruthy();
    });
  });

  describe('parseExperience', () => {
    it('extracts the reliable min years from N+ expressions', () => {
      expect(parseExperience('8+ years')).toEqual({ minExperience: 8, maxExperience: null });
      expect(parseExperience('15+ Years (6-7 in BFSI)')).toEqual({
        minExperience: 15,
        maxExperience: null,
      });
      expect(parseExperience('3+ Years')).toEqual({ minExperience: 3, maxExperience: null });
    });

    it('extracts ranges only when a year unit is present', () => {
      expect(parseExperience('4–6 years')).toEqual({ minExperience: 4, maxExperience: 6 });
      expect(parseExperience('Qualified CS with LLB. 4-6 years relevant experience')).toEqual({
        minExperience: 4,
        maxExperience: 6,
      });
      expect(parseExperience('Leadership (0 to 500+ scale)')).toEqual({
        minExperience: null,
        maxExperience: null,
      });
    });

    it('does not invent numbers from free text', () => {
      expect(parseExperience('Up to 60 LPA')).toEqual({ minExperience: null, maxExperience: null });
      expect(parseExperience(null)).toEqual({ minExperience: null, maxExperience: null });
    });
  });

  describe('client workbook', () => {
    const workbook = XLSX.readFile(
      join(__dirname, '../../../test/fixtures/gravitas-edge-job-board.xlsx'),
    );

    it('selects exactly one sheet matching the vault name in a multi-sheet workbook', () => {
      expect(selectSheetName(workbook, 'UAE & GCC Access', 'xlsx')).toBe('UAE & GCC Access');
      expect(selectSheetName(workbook, ' Management Access ', 'xlsx')).toBe('Management Access');
    });

    it('throws when no sheet exactly matches the selected vault', () => {
      expect(() => selectSheetName(workbook, 'Design Vault', 'xlsx')).toThrow(
        /none exactly matches the selected vault/,
      );
    });

    it('parses Remote Access rows and resolves month-name dates', () => {
      const rows = parseSheetRows(workbook.Sheets['Remote Access']);
      const titled = rows.filter((r) => r.fields.title);
      expect(titled.length).toBe(157);
      for (const row of titled) {
        const parsed = parseDateCell(row.fields.date);
        expect(parsed.date).toBeInstanceOf(Date);
      }
    });

    it('flags Executive Access rows marked for removal from the vault', () => {
      const rows = parseSheetRows(workbook.Sheets['Executive Access']);
      expect(rows.filter((r) => r.removalNote).length).toBe(385);
      expect(rows.filter((r) => r.fields.title).length).toBe(584);
    });

    it('preserves long experience text on Management Access rows (keeps descriptions)', () => {
      const rows = parseSheetRows(workbook.Sheets['Management Access']);
      const long = rows.find((r) => (r.fields.experienceText ?? '').length > 500);
      expect(long).toBeDefined();
    });

    it('recognizes ' + 'Read Me First' + ' as a non-job sheet', () => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Read Me First'], {
        header: 1,
        defval: null,
      });
      expect(findHeaderRow(rows as unknown[][])).toBeNull();
    });

    it('counts per-sheet titled rows (source of truth for import previews)', () => {
      const expected: Record<string, number> = {
        'Remote Access': 157,
        'UAE & GCC Access': 994,
        'Executive Access': 584,
        'Leadership Access': 1090,
        'Management Access': 751,
        'Early Career Access': 294,
      };
      for (const [sheet, count] of Object.entries(expected)) {
        const rows = parseSheetRows(workbook.Sheets[sheet]);
        expect(rows.filter((r) => r.fields.title).length).toBe(count);
      }
    });
  });
});
