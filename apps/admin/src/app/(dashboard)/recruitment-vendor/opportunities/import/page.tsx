'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminPreviewRvaImport, adminImportRvaOpportunities } from '@/lib/services';
import {
  RvaImportPreviewResponse,
  RvaImportPreviewRow,
  RvaImportPreviewSheet,
  RVA_CATEGORY_LABELS,
  RVA_OPPORTUNITY_STATUSES,
} from '@/lib/types';
import { Alert, Badge, Button, Card, PageHeader, Select, Skeleton, useToast } from '@/components/ui';
import { titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const STATUS_OPTIONS = RVA_OPPORTUNITY_STATUSES.filter(
  (s) => s !== 'ARCHIVED' && s !== 'EXPIRED',
).map((s) => ({ value: s, label: titleCase(s) }));

export default function ImportRvaOpportunitiesPage() {
  const { showToast } = useToast();
  const [defaultStatus, setDefaultStatus] = useState('PUBLISHED');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RvaImportPreviewResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setPreview(null);
    setError('');
  };

  const runPreview = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await adminPreviewRvaImport(file, undefined, defaultStatus);
      setPreview(res);
    } catch (e) {
      setError(getErrorMessage(e));
      setPreview(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const res = await adminImportRvaOpportunities(file, undefined, defaultStatus);
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
    c: RvaImportPreviewRow['classification'],
  ): 'success' | 'danger' | 'warning' | 'neutral' =>
    c === 'VALID'
      ? 'success'
      : c === 'DUPLICATE'
        ? 'warning'
        : c === 'INVALID'
          ? 'danger'
          : 'neutral';

  const rowDetail = (row: RvaImportPreviewRow): string =>
    row.classification === 'VALID'
      ? [
          row.fields?.jobId ? `Job ID: ${row.fields.jobId}` : null,
          row.fields?.company,
          row.fields?.organization,
          row.fields?.location,
          row.fields?.country,
          row.fields?.sector,
          row.fields?.salary,
          row.fields?.minExperience ? `${row.fields.minExperience}+ yrs` : null,
          row.fields?.qualification,
        ]
          .filter(Boolean)
          .filter((x) => String(x).trim() !== '')
          .join(' · ')
      : (row.reason ?? '');

  const importableRows = preview
    ? preview.sheets.reduce((n, s) => n + s.summary.valid, 0)
    : 0;

  return (
    <div>
      <Link
        href="/recruitment-vendor/opportunities"
        className="mb-4 inline-block text-sm text-brand-600"
      >
        ← Back to RVA opportunities
      </Link>
      <PageHeader
        title="Import RVA Jobs"
        subtitle="Upload a CSV or Excel file, preview, then confirm — jobs import directly with no category needed."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="1. Select file">
          <div className="space-y-4">
            <Select
              label="Default status"
              value={defaultStatus}
              onChange={(e) => {
                setDefaultStatus(e.target.value);
                reset();
              }}
              options={STATUS_OPTIONS}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-content">File</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="block w-full text-sm text-content file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-950 dark:file:text-brand-300"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  reset();
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-content-muted">
              Every job sheet in the workbook is uploaded as-is, with no category required. A row
              may still set its own &quot;Category&quot; column, and a recognized &quot;Status&quot;
              column overrides the default status. Rows with a Job ID that already exists are
              skipped as duplicates. Empty rows are ignored, and the latest 500 rows per sheet are
              processed.
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <Button
              className="w-full"
              onClick={runPreview}
              loading={analyzing}
              disabled={!file}
            >
              Preview import
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          {analyzing ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : preview ? (
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

              <div className="mt-5 space-y-5">
                {preview.sheets.map((sheet: RvaImportPreviewSheet) =>
                  sheet.status === 'IMPORTED' ? (
                    <div key={sheet.sheetName}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-content">
                          {sheet.sheetName}
                          <span className="ml-2 font-normal text-content-muted">
                            → {RVA_CATEGORY_LABELS[sheet.category] ?? sheet.category}
                          </span>
                        </h4>
                        <span className="text-xs text-content-muted">{sheet.summary.total} rows</span>
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
                        <Badge variant={sheet.status === 'EMPTY' ? 'neutral' : 'danger'}>
                          {sheet.status}
                        </Badge>
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
                  Valid rows will be imported into the selected category. Invalid and duplicate rows
                  are skipped. This action is logged to the audit trail.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={runPreview} loading={analyzing}>
                    Re-analyze
                  </Button>
                  <Button onClick={runImport} loading={importing} disabled={importableRows === 0}>
                    Confirm & import ({importableRows})
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold text-content">Awaiting preview</p>
              <p className="mt-1 max-w-sm text-sm text-content-muted">
                Pick a category and a file, then click &quot;Preview import&quot; to see exactly what
                will be created, rejected, or skipped — nothing is saved until you confirm.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
