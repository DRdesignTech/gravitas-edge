import { join } from 'path';
import * as XLSX from 'xlsx';
import {
  compareJobsForDuplicate,
  duplicateExperienceKey,
  findHeaderRow,
  listJobSheets,
  mapHeadersToFields,
  matchSheetToVault,
  meaningfulTokens,
  normalizeDuplicateText,
  normalizeHeaderKey,
  normalizeVaultText,
  parseDateCell,
  parseExperience,
  parseSheetRows,
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

    it('maps qualification and how-to-apply headers to canonical fields', () => {
      const colMap = mapHeadersToFields([
        'Qualification',
        'Other Details',
        'How to Apply',
        'How to Apply Email',
        'How to Apply URL',
      ]);
      expect(Object.values(colMap).sort()).toEqual(
        ['applicationContact', 'applicationUrl', 'description', 'qualification'].sort(),
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

  describe('normalizeDuplicateText', () => {
    it('trims, lower-cases and collapses whitespace and punctuation runs', () => {
      expect(normalizeDuplicateText('  Software   Engineer ')).toBe('software engineer');
      expect(normalizeDuplicateText('Acme  Corp.')).toBe('acme corp');
      expect(normalizeDuplicateText('New York, NY')).toBe('new york ny');
      expect(normalizeDuplicateText('Full-Time')).toBe('full time');
      expect(normalizeDuplicateText('Full_Time')).toBe('full time');
      expect(normalizeDuplicateText('R&D')).toBe('r and d');
      expect(normalizeDuplicateText(null)).toBe('');
      expect(normalizeDuplicateText(undefined)).toBe('');
      expect(normalizeDuplicateText('   ')).toBe('');
    });

    it('keeps meaningful symbols so distinct values never collapse together', () => {
      expect(normalizeDuplicateText('C++')).toBe('c++');
      expect(normalizeDuplicateText('C#')).toBe('c#');
      expect(normalizeDuplicateText('C')).toBe('c');
      expect(normalizeDuplicateText('C++')).not.toBe(normalizeDuplicateText('C'));
    });
  });

  describe('duplicateExperienceKey', () => {
    it('treats equivalent experience formatting as equal', () => {
      expect(duplicateExperienceKey({ experienceText: '4-6 years' })).toBe(
        duplicateExperienceKey({ experienceText: '4 to 6 yrs' }),
      );
      expect(duplicateExperienceKey({ minExperience: 5, experienceText: '5+ years' })).toBe(
        duplicateExperienceKey({ experienceText: '5 years' }),
      );
    });

    it('falls back to normalized text and treats missing experience as empty', () => {
      expect(duplicateExperienceKey({ experienceText: 'Fresher' })).toBe('fresher');
      expect(duplicateExperienceKey({})).toBe('');
      expect(duplicateExperienceKey({ experienceText: null })).toBe('');
    });
  });

  describe('compareJobsForDuplicate', () => {
    const fullJob = {
      title: 'Software Engineer',
      company: 'Acme Corp',
      location: 'Dubai',
      salary: 'AED 20000',
      experienceText: '5+ years',
      minExperience: 5,
      maxExperience: null,
    };

    it('flags completely identical jobs as duplicates', () => {
      const result = compareJobsForDuplicate(fullJob, { ...fullJob });
      expect(result.duplicate).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    it('does not flag the same title when the company differs', () => {
      const result = compareJobsForDuplicate(fullJob, { ...fullJob, company: 'Globex' });
      expect(result.duplicate).toBe(false);
      expect(result.conflicts).toContain('company');
    });

    it('does not flag matching title/company when the location differs', () => {
      const result = compareJobsForDuplicate(fullJob, { ...fullJob, location: 'Tokyo' });
      expect(result.duplicate).toBe(false);
      expect(result.conflicts).toContain('location');
    });

    it('does not flag when salary, experience or details differ', () => {
      expect(compareJobsForDuplicate(fullJob, { ...fullJob, salary: 'AED 30000' }).duplicate).toBe(
        false,
      );
      expect(
        compareJobsForDuplicate(fullJob, {
          ...fullJob,
          minExperience: 8,
          experienceText: '8+ years',
        }).duplicate,
      ).toBe(false);
      expect(
        compareJobsForDuplicate(
          { ...fullJob, description: 'Build APIs' },
          { ...fullJob, description: 'Something else' },
        ).duplicate,
      ).toBe(false);
    });

    it('does not flag on the title alone when the other record knows more', () => {
      const result = compareJobsForDuplicate(fullJob, { title: 'Software Engineer' });
      expect(result.duplicate).toBe(false);
      expect(result.matched).toEqual(['title']);
      expect(result.conflicts).toEqual([]);
      expect(result.oneSided.length).toBeGreaterThan(0);
    });

    it('flags two records that only carry the same title', () => {
      expect(
        compareJobsForDuplicate({ title: 'Repeat Role' }, { title: 'Repeat Role' }).duplicate,
      ).toBe(true);
    });

    it('ignores fields that are missing or empty in both records', () => {
      const result = compareJobsForDuplicate(
        { title: 'Dev', company: null, salary: undefined },
        { title: 'Dev', company: undefined, salary: null },
      );
      expect(result.duplicate).toBe(true);
      expect(result.matched).toEqual(['title']);
      expect(result.conflicts).toEqual([]);
      expect(result.oneSided).toEqual([]);
    });

    it('still flags a duplicate when corroborating fields match despite a one-sided field', () => {
      const result = compareJobsForDuplicate(fullJob, {
        ...fullJob,
        country: 'UAE',
      });
      expect(result.duplicate).toBe(true);
      expect(result.oneSided).toContain('country');
    });

    it('treats a differing external reference as a difference', () => {
      const result = compareJobsForDuplicate(
        { ...fullJob, externalRef: '101' },
        { ...fullJob, externalRef: '999' },
      );
      expect(result.duplicate).toBe(false);
      expect(result.conflicts).toContain('externalRef');
    });
  });

  describe('vault matching', () => {
    const vaults = [
      { id: 'remote', name: 'Remote Access Vault', type: 'INTERNATIONAL' },
      { id: 'uae', name: 'UAE & Global Access Vault', type: 'MIDDLE_EAST' },
      { id: 'executive', name: 'Executive Access Vault', type: 'INDIA' },
      { id: 'leadership', name: 'Leadership Access Vault', type: 'INDIA' },
      { id: 'management', name: 'Management Access Vault', type: 'INDIA' },
      { id: 'early', name: 'Early Career Access Vault', type: 'INDIA' },
    ];

    const expectedMatches: Record<string, string> = {
      'Remote Access': 'Remote Access Vault',
      'UAE & Global': 'UAE & Global Access Vault',
      Executive: 'Executive Access Vault',
      Leadership: 'Leadership Access Vault',
      Management: 'Management Access Vault',
      'Early Career': 'Early Career Access Vault',
    };

    for (const [sheet, vaultName] of Object.entries(expectedMatches)) {
      it(`matches "${sheet}" to "${vaultName}"`, () => {
        const result = matchSheetToVault(sheet, vaults);
        expect(result.status).toBe('matched');
        if (result.status === 'matched') expect(result.vault.name).toBe(vaultName);
      });
    }

    it('is case-insensitive and ignores extra words, spacing, hyphens and "&"', () => {
      expect(matchSheetToVault('executive', vaults).status).toBe('matched');
      expect(matchSheetToVault('Executive Access', vaults).status).toBe('matched');
      expect(matchSheetToVault('Executive Access Vault', vaults).status).toBe('matched');
      expect(matchSheetToVault('  executive--access_vault ', vaults).status).toBe('matched');
      expect(matchSheetToVault('uae-and-global', vaults).status).toBe('matched');
      expect(matchSheetToVault('management_vault', vaults).status).toBe('matched');
    });

    it('does not match unrelated or overly-broad sheet names', () => {
      expect(matchSheetToVault('Sales', vaults).status).toBe('unmatched');
      expect(matchSheetToVault('Finance', vaults).status).toBe('unmatched');
      expect(matchSheetToVault('Vault', vaults).status).toBe('unmatched');
      expect(matchSheetToVault('Access', vaults).status).toBe('unmatched');
      expect(matchSheetToVault('', vaults).status).toBe('unmatched');
    });

    it('reports ambiguity instead of guessing when two vaults are equally strong', () => {
      const withTwin = [...vaults, { id: 'remote2', name: 'Remote Vault', type: 'INTERNATIONAL' }];
      const result = matchSheetToVault('Remote', withTwin);
      expect(result.status).toBe('ambiguous');
      if (result.status === 'ambiguous') {
        expect(result.candidates.map((c) => c.name).sort()).toEqual(
          ['Remote Access Vault', 'Remote Vault'].sort(),
        );
      }
    });

    it('prefers an exact normalized match when several vaults share tokens', () => {
      const withSub = [
        ...vaults,
        { id: 'intl', name: 'Remote Access International Vault', type: 'INTERNATIONAL' },
      ];
      const result = matchSheetToVault('Remote Access Vault', withSub);
      expect(result.status).toBe('matched');
      if (result.status === 'matched') {
        expect(result.vault.name).toBe('Remote Access Vault');
      }
    });

    it('normalizes vault-like text predictably', () => {
      expect(normalizeVaultText('Executive Access Vault')).toBe('executive access vault');
      expect(normalizeVaultText('UAE & Global')).toBe('uae and global');
      expect(meaningfulTokens('Remote Access Vault')).toEqual(['remote']);
      expect(meaningfulTokens('Vault')).toEqual([]);
    });
  });

  describe('For Sparsh (1).xlsx workbook', () => {
    const workbook = XLSX.readFile(join(__dirname, '../../../test/fixtures/For Sparsh (1).xlsx'));
    const vaults = [
      { id: 'remote', name: 'Remote Access Vault', type: 'INTERNATIONAL' },
      { id: 'uae', name: 'UAE & Global Access Vault', type: 'MIDDLE_EAST' },
      { id: 'executive', name: 'Executive Access Vault', type: 'INDIA' },
      { id: 'leadership', name: 'Leadership Access Vault', type: 'INDIA' },
      { id: 'management', name: 'Management Access Vault', type: 'INDIA' },
      { id: 'early', name: 'Early Career Access Vault', type: 'INDIA' },
    ];

    it('identifies all keyword-named job sheets and the pricing meta sheet', () => {
      const { jobSheets, metaSheets } = listJobSheets(workbook);
      expect(jobSheets).toEqual([
        'Remote Access',
        'UAE & Global',
        'Executive',
        'Leadership',
        'Management',
        'Early Career',
      ]);
      expect(metaSheets).toEqual(['Vaults & Prices']);
    });

    it('maps every job sheet to its corresponding vault', () => {
      const { jobSheets } = listJobSheets(workbook);
      const expected: Record<string, string> = {
        'Remote Access': 'Remote Access Vault',
        'UAE & Global': 'UAE & Global Access Vault',
        Executive: 'Executive Access Vault',
        Leadership: 'Leadership Access Vault',
        Management: 'Management Access Vault',
        'Early Career': 'Early Career Access Vault',
      };
      for (const sheet of jobSheets) {
        const result = matchSheetToVault(sheet, vaults);
        expect(result.status).toBe('matched');
        if (result.status === 'matched') expect(result.vault.name).toBe(expected[sheet]);
      }
    });

    it('counts per-sheet titled rows for the keyword-named sheets', () => {
      const expected: Record<string, number> = {
        'Remote Access': 75,
        'UAE & Global': 179,
        Executive: 147,
        Leadership: 206,
        Management: 228,
        'Early Career': 93,
      };
      for (const [sheet, count] of Object.entries(expected)) {
        const rows = parseSheetRows(workbook.Sheets[sheet]);
        expect(rows.filter((r) => r.fields.title).length).toBe(count);
      }
    });

    it('treats the pricing sheet as a non-job sheet', () => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Vaults & Prices'], {
        header: 1,
        defval: null,
      });
      expect(findHeaderRow(rows as unknown[][])).toBeNull();
    });
  });

  describe('client workbook', () => {
    const workbook = XLSX.readFile(
      join(__dirname, '../../../test/fixtures/gravitas-edge-job-board.xlsx'),
    );

    it('fuzzy-matches keyword sheet names to the corresponding vaults', () => {
      const vaults = [
        { id: 'remote', name: 'Remote Access Vault', type: 'INTERNATIONAL' },
        { id: 'uae', name: 'UAE & Global Access Vault', type: 'MIDDLE_EAST' },
        { id: 'executive', name: 'Executive Access Vault', type: 'INDIA' },
        { id: 'leadership', name: 'Leadership Access Vault', type: 'INDIA' },
        { id: 'management', name: 'Management Access Vault', type: 'INDIA' },
        { id: 'early', name: 'Early Career Access Vault', type: 'INDIA' },
      ];
      const uae = matchSheetToVault('UAE & GCC Access', vaults);
      expect(uae.status).toBe('matched');
      if (uae.status === 'matched') expect(uae.vault.id).toBe('uae');

      const management = matchSheetToVault(' Management Access ', vaults);
      expect(management.status).toBe('matched');
      if (management.status === 'matched') expect(management.vault.id).toBe('management');
    });

    it('does not match an unknown vault-like keyword to any sheet', () => {
      const vaults = [
        { id: 'remote', name: 'Remote Access Vault', type: 'INTERNATIONAL' },
        { id: 'uae', name: 'UAE & Global Access Vault', type: 'MIDDLE_EAST' },
        { id: 'executive', name: 'Executive Access Vault', type: 'INDIA' },
        { id: 'leadership', name: 'Leadership Access Vault', type: 'INDIA' },
        { id: 'management', name: 'Management Access Vault', type: 'INDIA' },
        { id: 'early', name: 'Early Career Access Vault', type: 'INDIA' },
      ];
      expect(matchSheetToVault('Design', vaults).status).toBe('unmatched');
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
