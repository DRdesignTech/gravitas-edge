'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminPreviewImport, adminImportOpportunities, adminListVaults } from '@/lib/services';
import {
  Vault,
  ImportPreviewRow,
  ImportPreviewResponse,
  ImportPreviewSheet,
  ImportSheetSelection,
} from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_STATUSES } from '@/lib/types';

export default function ImportOpportunitiesPage() {
  const { showToast } = useToast();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultId, setVaultId] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('PUBLISHED');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    adminListVaults({ page: 1, limit: 100 })
      .then((v) => setVaults(v.items.filter((x) => x.status !== 'ARCHIVED')))
      .catch(() => {});
  }, []);

  const runPreview = async () => {
    if (!file || !vaultId) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await adminPreviewImport(file, vaultId, defaultStatus);
      setPreview(res);
      const initial: Record<string, boolean> = {};
      for (const sheet of res.sheets) {
        initial[sheet.sheetName] = sheet.matchStatus === 'matched';
      }
      setEdits(initial);
    } catch (e) {
      setError(getErrorMessage(e));
      setPreview(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const runImport = async () => {
    if (!file || !vaultId) return;
    setImporting(true);
    setError('');
    try {
      const selections: ImportSheetSelection[] = (preview?.sheets ?? [])
        .filter((s) => s.matchStatus !== 'meta')
        .map((s) => ({
          sheetName: s.sheetName,
          include: edits[s.sheetName] ?? s.matchStatus === 'matched',
        }));
      const res = await adminImportOpportunities(file, vaultId, defaultStatus, selections);
      showToast(
        `Imported ${res.imported}, failed ${res.failed}, skipped ${res.skipped}`,
        'success',
      );
      setPreview(null);
      setEdits({});
      setFile(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const classificationVariant = (
    c: ImportPreviewRow['classification'],
  ): 'success' | 'danger' | 'warning' | 'neutral' =>
    c === 'VALID'
      ? 'success'
      : c === 'DUPLICATE'
        ? 'warning'
        : c === 'INVALID'
          ? 'danger'
          : 'neutral';

  const sheetStatusVariant = (
    s: ImportPreviewSheet,
  ): 'success' | 'danger' | 'warning' | 'neutral' =>
    s.status === 'IMPORTED' ? 'success' : s.status === 'EMPTY' ? 'neutral' : 'danger';

  const isIncluded = (sheetName: string): boolean => edits[sheetName] ?? false;

  const editableSheets = preview?.sheets ?? [];
  const importableValid = editableSheets.reduce(
    (n, s) => n + (isIncluded(s.sheetName) ? s.summary.valid : 0),
    0,
  );
  const includedEmpty = editableSheets.some(
    (s) => isIncluded(s.sheetName) && s.summary.valid === 0,
  );

  const rowDetail = (row: ImportPreviewRow): string =>
    row.classification === 'VALID'
      ? [
          row.fields?.location,
          row.fields?.industry,
          row.fields?.salary,
          row.fields?.minExperience ? `${row.fields.minExperience}+ yrs` : null,
          row.fields?.qualification,
          row.fields?.description,
          row.fields?.howToApply,
        ]
          .filter(Boolean)
          .filter((x) => String(x).trim() !== '')
          .join(' · ')
      : (row.reason ?? '');

  return (
    <div>
      <Link href="/opportunities" className="mb-4 inline-block text-sm text-brand-600">
        ← Back to opportunities
      </Link>
      <PageHeader
        title="Import Jobs"
        subtitle="Upload a CSV or Excel file, select the destination vault, preview changes, then confirm."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="1. Select vault & file">
          <div className="space-y-4">
            <Select
              label="Destination vault"
              placeholder={vaults.length === 0 ? 'Loading…' : 'Select a vault'}
              required
              value={vaultId}
              disabled={vaults.length === 0}
              onChange={(e) => {
                setVaultId(e.target.value);
                setPreview(null);
                setEdits({});
              }}
              options={vaults.map((v) => ({ value: v.id, label: v.name }))}
            />
            <Select
              label="Default status"
              value={defaultStatus}
              onChange={(e) => {
                setDefaultStatus(e.target.value);
                setPreview(null);
                setEdits({});
              }}
              options={OPPORTUNITY_STATUSES.filter((s) => s !== 'ARCHIVED' && s !== 'EXPIRED').map(
                (s) => ({ value: s, label: titleCase(s) }),
              )}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-content">File</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="block w-full text-sm text-content file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-950 dark:file:text-brand-300"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setPreview(null);
                  setEdits({});
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-content-muted">
              For a multi-sheet Excel workbook, each job sheet is matched to a vault using its name.
              A sheet whose keywords match a vault is imported into that vault; sheets that cannot
              be matched (or match multiple vaults) are skipped with an explanation. A single-sheet
              workbook is imported into the selected destination vault. Rows marked &quot;remove
              from the vault&quot; are skipped, and empty rows are ignored. Latest 500 rows per
              sheet are processed.
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <Button
              className="w-full"
              onClick={runPreview}
              loading={analyzing}
              disabled={!file || !vaultId}
            >
              Preview import
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          {analyzing ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : preview ? (
            <>
              <Card title="Import preview">
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-surface-muted p-4 text-center dark:bg-line/30">
                    <p className="text-2xl font-bold">{preview.summary.total}</p>
                    <p className="text-xs text-content-muted">Total</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{preview.summary.valid}</p>
                    <p className="text-xs text-emerald-700">Valid</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{preview.summary.invalid}</p>
                    <p className="text-xs text-red-700">Invalid</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-700">
                      {preview.summary.duplicate + preview.summary.skipped}
                    </p>
                    <p className="text-xs text-amber-700">Duplicate / Skipped</p>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold text-content">Sheets & vaults</h3>
                  <p className="mb-3 text-xs text-content-muted">
                    Tick the sheets you want to import — each imports into its matched vault. Untick
                    any sheet to skip it, so you can import only the vaults you need. Sheets without
                    a matching vault cannot be imported.
                  </p>
                  <ul className="space-y-2">
                    {editableSheets.map((sheet) => {
                      const included = isIncluded(sheet.sheetName);
                      const isMeta = sheet.matchStatus === 'meta';
                      const canImport = sheet.matchStatus === 'matched' && Boolean(sheet.vault);
                      return (
                        <li key={sheet.sheetName} className="rounded-lg border border-line p-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                disabled={!canImport}
                                checked={included}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [sheet.sheetName]: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              />
                              <span className="text-sm font-medium text-content">
                                {sheet.sheetName}
                              </span>
                            </label>
                            <Badge variant={sheetStatusVariant(sheet)}>{sheet.matchStatus}</Badge>
                            <span className="text-xs text-content-muted">
                              {isMeta
                                ? 'no job data'
                                : `${sheet.summary.total} rows · ${sheet.summary.valid} valid`}
                            </span>
                            {canImport && sheet.vault && (
                              <span className="ml-auto text-xs text-content-muted">
                                → {sheet.vault.name}
                              </span>
                            )}
                          </div>
                          {(!included || !canImport) && sheet.reason && (
                            <p className="mt-1.5 text-xs text-content-muted">{sheet.reason}</p>
                          )}
                          {canImport && !included && (
                            <p className="mt-1.5 text-xs text-content-muted">
                              Excluded — this sheet will not be imported.
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-5 space-y-5">
                  {editableSheets.map((sheet) =>
                    sheet.status === 'IMPORTED' ? (
                      <div key={sheet.sheetName}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-content">
                            {sheet.sheetName}
                            {sheet.vault ? (
                              <span className="ml-2 font-normal text-content-muted">
                                → {sheet.vault.name}
                              </span>
                            ) : null}
                          </h4>
                          <span className="text-xs text-content-muted">
                            {sheet.summary.total} rows
                          </span>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-line">
                          <table className="min-w-full divide-y divide-line text-sm">
                            <thead className="sticky top-0 bg-surface-muted dark:bg-surface">
                              <tr>
                                {['Row', 'Result', 'Title', 'Detail'].map((h) => (
                                  <th
                                    key={h}
                                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-content-muted"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {sheet.rows.map((row) => (
                                <tr key={`${sheet.sheetName}-${row.excelRow}`}>
                                  <td className="px-4 py-2 text-content-muted">{row.excelRow}</td>
                                  <td className="px-4 py-2">
                                    <Badge variant={classificationVariant(row.classification)}>
                                      {row.classification}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 font-medium text-content">
                                    {row.title || '—'}
                                  </td>
                                  <td className="px-4 py-2 text-content-muted">{rowDetail(row)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div key={sheet.sheetName} className="rounded-lg border border-line p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-content">{sheet.sheetName}</h4>
                          <Badge variant={sheetStatusVariant(sheet)}>{sheet.status}</Badge>
                        </div>
                        {sheet.reason && (
                          <p className="mt-1 text-xs text-content-muted">{sheet.reason}</p>
                        )}
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs text-content-muted">
                    Valid rows from the ticked sheets will be imported into their matched vaults.
                    Unticked sheets and invalid/duplicate rows are skipped. This action is logged to
                    the audit trail.
                    {includedEmpty && (
                      <span className="mt-1 block text-amber-700">
                        One or more ticked sheets have no valid rows and will import nothing.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={runPreview} loading={analyzing}>
                      Re-analyze
                    </Button>
                    <Button
                      onClick={runImport}
                      loading={importing}
                      disabled={importableValid === 0}
                    >
                      Confirm & import ({importableValid})
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold text-content">Awaiting preview</p>
              <p className="mt-1 max-w-sm text-sm text-content-muted">
                Pick a vault and a file, then click &quot;Preview import&quot; to see exactly what
                will be created, rejected, or skipped — nothing is saved until you confirm.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
