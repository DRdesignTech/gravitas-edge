'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminPreviewImport, adminImportOpportunities, adminListVaults } from '@/lib/services';
import { Vault, ImportPreviewRow } from '@/lib/types';
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
  const [preview, setPreview] = useState<{
    sheetName: string;
    summary: { total: number; valid: number; invalid: number; duplicate: number; skipped: number };
    rows: ImportPreviewRow[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

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
      setPreview({
        sheetName: res.sheetName,
        summary: res.summary,
        rows: res.rows,
      });
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
      const res = await adminImportOpportunities(file, vaultId, defaultStatus);
      showToast(
        `Imported ${res.imported}, failed ${res.failed}, skipped ${res.skipped}`,
        'success',
      );
      setPreview(null);
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
              }}
              options={vaults.map((v) => ({ value: v.id, label: v.name }))}
            />
            <Select
              label="Default status"
              value={defaultStatus}
              onChange={(e) => {
                setDefaultStatus(e.target.value);
                setPreview(null);
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
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-content-muted">
              For a multi-sheet Excel workbook, the sheet whose name matches the selected vault is
              imported. Rows marked &quot;remove from the vault&quot; are skipped, and empty rows
              are ignored. Latest 500 rows are processed.
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
              <Card title={`Previewing “${preview.sheetName}”`}>
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

                <div className="mt-5 max-h-[420px] overflow-y-auto rounded-xl border border-line">
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
                      {preview.rows.map((row) => (
                        <tr key={row.excelRow}>
                          <td className="px-4 py-2 text-content-muted">{row.excelRow}</td>
                          <td className="px-4 py-2">
                            <Badge variant={classificationVariant(row.classification)}>
                              {row.classification}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 font-medium text-content">{row.title || '—'}</td>
                          <td className="px-4 py-2 text-content-muted">
                            {row.classification === 'VALID'
                              ? [
                                  row.fields?.location,
                                  row.fields?.industry,
                                  row.fields?.salary,
                                  row.fields?.minExperience
                                    ? `${row.fields.minExperience}+ yrs`
                                    : null,
                                  row.fields?.qualification,
                                  row.fields?.description,
                                  row.fields?.howToApply,
                                ]
                                  .filter(Boolean)
                                  .filter((x) => String(x).trim() !== '')
                                  .join(' · ')
                              : row.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs text-content-muted">
                    Valid rows will be imported, invalid and duplicate rows will be skipped. This
                    action is logged to the audit trail.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={runPreview} loading={analyzing}>
                      Re-analyze
                    </Button>
                    <Button
                      onClick={runImport}
                      loading={importing}
                      disabled={preview.summary.valid === 0}
                    >
                      Confirm & import ({preview.summary.valid})
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
