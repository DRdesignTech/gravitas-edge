'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminListResumes,
  adminDownloadResume,
  adminExtractResume,
  adminGetResume,
} from '@/lib/services';
import { AdminResume, AdminResumeQuery, AdminResumeSource, AdminResumeSortBy } from '@/lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  LoadingSpinner,
  StatusBadge,
  Table,
  ConfirmDialog,
  useToast,
  Input,
  Select,
  Badge,
  SearchIcon,
  DownloadIcon,
  EyeIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  FileTextIcon,
} from '@/components/ui';
import { formatDate, formatFileSize } from '@/lib/format';

const SOURCE_LABELS: Record<AdminResumeSource, string> = {
  ALL: 'All Sources',
  AUTHENTICATED: 'Authenticated Users',
  GUEST: 'Guest Uploads',
};

const UPLOAD_STATUS_LABELS: Record<string, string> = {
  UPLOADED: 'Uploaded',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const SOURCE_BADGE_VARIANTS: Record<string, 'success' | 'warning' | 'info'> = {
  AUTHENTICATED: 'success',
  GUEST: 'warning',
};

export default function ResumesPage() {
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<AdminResume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [query, setQuery] = useState<AdminResumeQuery>({
    page: 1,
    limit: 20,
    search: '',
    source: AdminResumeSource.ALL,
    sortBy: AdminResumeSortBy.UPLOADED_AT,
    sortOrder: 'desc',
    includeProfile: false,
  });

  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<AdminResume | null>(null);
  const [viewDetailLoading, setViewDetailLoading] = useState(false);
  const [extractId, setExtractId] = useState<string | null>(null);

  const loadResumes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListResumes(query);
      setResumes(result.data);
      setTotalItems(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load resumes';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [
    query.page,
    query.search,
    query.source,
    query.fileType,
    query.uploadStatus,
    query.uploadedAfter,
    query.uploadedBefore,
    query.sortBy,
    query.sortOrder,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleSort = (sortBy: AdminResumeSortBy) => {
    setQuery((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleDownload = async (id: string, filename: string) => {
    try {
      const blob = await adminDownloadResume(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Download started', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Download failed', 'error');
    }
  };

  const handleViewDetail = async (id: string) => {
    setViewDetailId(id);
    setViewDetailLoading(true);
    try {
      const detail = await adminGetResume(id, true);
      setViewDetail(detail);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load details', 'error');
    } finally {
      setViewDetailLoading(false);
    }
  };

  const handleExtract = async (id: string) => {
    setExtractId(id);
    try {
      const result = await adminExtractResume(id);
      showToast('Extraction completed', 'success');
      setViewDetail(result.data);
      loadResumes();
    } catch (err: any) {
      showToast(err?.message || 'Extraction failed', 'error');
    } finally {
      setExtractId(null);
    }
  };

  const formatSize = (bytes: number) => formatFileSize(bytes);

  const getStatusBadge = (status: string) => {
    const variant: 'success' | 'warning' | 'danger' | 'info' =
      status === 'COMPLETED'
        ? 'success'
        : status === 'PROCESSING'
          ? 'warning'
          : status === 'FAILED'
            ? 'danger'
            : 'info';
    return <StatusBadge status={UPLOAD_STATUS_LABELS[status] || status} />;
  };

  const columns = useMemo(
    () => [
      {
        key: 'source',
        label: 'Source',
        render: (item: AdminResume) => (
          <Badge variant={SOURCE_BADGE_VARIANTS[item.source] || 'info'} className="text-[10px]">
            {item.source === 'GUEST' ? 'Guest' : 'User'}
          </Badge>
        ),
      },
      {
        key: 'fullName',
        label: 'Candidate Name',
        render: (item: AdminResume) => (
          <p className="min-w-0 truncate font-medium text-content">
            {item.fullName || item.user?.fullName || '—'}
          </p>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        render: (item: AdminResume) => (
          <p className="min-w-0 truncate text-content">{item.email || '—'}</p>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (item: AdminResume) => (
          <p className="min-w-0 truncate text-content">{item.phone || '—'}</p>
        ),
      },
      {
        key: 'originalName',
        label: 'Resume File',
        render: (item: AdminResume) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{item.originalName}</p>
            <p className="truncate text-xs text-content-muted">
              {item.fileType.toUpperCase()} · {formatSize(item.fileSize)}
              {!item.fileExists && (
                <span className="text-red-600 dark:text-red-400"> · Missing</span>
              )}
            </p>
          </div>
        ),
      },
      {
        key: 'uploadedAt',
        label: 'Uploaded',
        render: (item: AdminResume) => formatDate(item.uploadedAt),
      },
      {
        key: 'uploadStatus',
        label: 'Status',
        render: (item: AdminResume) => getStatusBadge(item.uploadStatus),
      },
      {
        key: 'actions',
        label: 'Download',
        render: (item: AdminResume) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(item.id, item.originalName)}
              disabled={!item.fileExists}
              title={`Download ${item.originalName}`}
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Download</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetail(item.id)}
              disabled={viewDetailLoading}
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {item.source === 'AUTHENTICATED' && !item.candidateProfile && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleExtract(item.id)}
                disabled={extractId === item.id}
                title="Extract Profile"
              >
                <FileTextIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [viewDetailLoading, extractId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumes"
        subtitle="Manage all candidate resumes from authenticated users and guest uploads"
      />

      <Card>
        <form onSubmit={handleSearch} className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <Input
                label="Search"
                placeholder="Filename, email, candidate name..."
                value={query.search}
                onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Source"
                value={query.source}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    source: e.target.value as AdminResumeSource,
                    page: 1,
                  }))
                }
                options={[
                  { value: AdminResumeSource.ALL, label: SOURCE_LABELS[AdminResumeSource.ALL] },
                  {
                    value: AdminResumeSource.AUTHENTICATED,
                    label: SOURCE_LABELS[AdminResumeSource.AUTHENTICATED],
                  },
                  { value: AdminResumeSource.GUEST, label: SOURCE_LABELS[AdminResumeSource.GUEST] },
                ]}
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Select
                label="File Type"
                value={query.fileType || ''}
                onChange={(e) =>
                  setQuery((prev) => ({ ...prev, fileType: e.target.value || undefined, page: 1 }))
                }
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'pdf', label: 'PDF' },
                  { value: 'doc', label: 'DOC' },
                  { value: 'docx', label: 'DOCX' },
                ]}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Status"
                value={query.uploadStatus || ''}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    uploadStatus: e.target.value || undefined,
                    page: 1,
                  }))
                }
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'UPLOADED', label: 'Uploaded' },
                  { value: 'QUEUED', label: 'Queued' },
                  { value: 'PROCESSING', label: 'Processing' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'FAILED', label: 'Failed' },
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full sm:w-auto">
                <SearchIcon className="h-4 w-4 mr-1" /> Search
              </Button>
            </div>
          </div>
        </form>

        {loading ? (
          <LoadingSpinner label="Loading resumes..." className="py-12" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadResumes} />
        ) : resumes.length === 0 ? (
          <EmptyState
            title="No resumes found"
            description="No resumes match your current filters."
            action={
              <Button
                variant="outline"
                onClick={() =>
                  setQuery((prev) => ({
                    ...prev,
                    search: '',
                    source: AdminResumeSource.ALL,
                    fileType: undefined,
                    uploadStatus: undefined,
                  }))
                }
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table<AdminResume>
                columns={columns}
                data={resumes}
                rowKey={(item) => item.id}
                emptyMessage="No resumes found"
              />
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-content-muted">
                  Page {query.page ?? 1} of {totalPages} · {totalItems} resume
                  {totalItems !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange((query.page ?? 1) - 1)}
                    disabled={(query.page ?? 1) === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange((query.page ?? 1) + 1)}
                    disabled={(query.page ?? 1) === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {viewDetailId && viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B36]/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface shadow-xl dark:bg-surface-elevated">
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="text-lg font-bold text-content">Resume Details</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setViewDetailId(null);
                  setViewDetail(null);
                }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      Filename
                    </p>
                    <p className="mt-1 text-content">{viewDetail.originalName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      File Type
                    </p>
                    <p className="mt-1 text-content">{viewDetail.fileType.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      File Size
                    </p>
                    <p className="mt-1 text-content">{formatSize(viewDetail.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      Uploaded
                    </p>
                    <p className="mt-1 text-content">{formatDate(viewDetail.uploadedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      Status
                    </p>
                    <p className="mt-1">{getStatusBadge(viewDetail.uploadStatus)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                      File
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={viewDetail.fileExists ? 'success' : 'danger'}>
                        {viewDetail.fileExists ? 'Available' : 'Missing'}
                      </Badge>
                      {viewDetail.fileExists && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(viewDetail.id, viewDetail.originalName)}
                        >
                          <DownloadIcon className="h-4 w-4 mr-1" /> Download
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <h3 className="font-semibold text-content">
                    {viewDetail.source === 'GUEST' ? 'Guest Upload' : 'Candidate'}
                  </h3>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-content-muted">Name:</span>{' '}
                      <span className="text-content ml-2">
                        {viewDetail.fullName || viewDetail.user?.fullName || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-content-muted">Email:</span>{' '}
                      <span className="text-content ml-2">{viewDetail.email || '—'}</span>
                    </p>
                    <p>
                      <span className="text-content-muted">Phone:</span>{' '}
                      <span className="text-content ml-2">{viewDetail.phone || '—'}</span>
                    </p>
                    <p>
                      <span className="text-content-muted">Source:</span>{' '}
                      <span className="text-content ml-2">
                        {viewDetail.source === 'GUEST' ? 'Guest' : 'Logged-in user'}
                      </span>
                    </p>
                  </div>
                </div>

                {viewDetail.candidateProfile && (
                  <div className="border-t border-line pt-4 space-y-6">
                    <h3 className="font-semibold text-content">Extracted Candidate Profile</h3>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      {viewDetail.candidateProfile.fullName && (
                        <p>
                          <span className="text-content-muted">Full Name:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.fullName}
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.email && (
                        <p>
                          <span className="text-content-muted">Email:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.email}
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.phone && (
                        <p>
                          <span className="text-content-muted">Phone:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.phone}
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.location && (
                        <p>
                          <span className="text-content-muted">Location:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.location}
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.totalExperienceMonths && (
                        <p>
                          <span className="text-content-muted">Total Experience:</span>{' '}
                          <span className="text-content ml-2">
                            {Math.floor(viewDetail.candidateProfile.totalExperienceMonths / 12)} yr{' '}
                            {viewDetail.candidateProfile.totalExperienceMonths % 12} mo
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.currentJobTitle && (
                        <p>
                          <span className="text-content-muted">Current Title:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.currentJobTitle}
                          </span>
                        </p>
                      )}
                      {viewDetail.candidateProfile.currentCompany && (
                        <p>
                          <span className="text-content-muted">Current Company:</span>{' '}
                          <span className="text-content ml-2">
                            {viewDetail.candidateProfile.currentCompany}
                          </span>
                        </p>
                      )}
                    </div>

                    {viewDetail.candidateProfile.skills?.length && (
                      <div>
                        <h4 className="font-medium text-content">
                          Skills ({viewDetail.candidateProfile.skills.length})
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewDetail.candidateProfile.skills.slice(0, 20).map((skill) => (
                            <Badge key={skill} variant="info" className="text-[10px]">
                              {skill}
                            </Badge>
                          ))}
                          {viewDetail.candidateProfile.skills.length > 20 && (
                            <Badge variant="info" className="text-[10px]">
                              +{viewDetail.candidateProfile.skills.length - 20} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {viewDetail.candidateProfile.workExperience?.length && (
                      <div>
                        <h4 className="font-medium text-content">Work Experience</h4>
                        <div className="mt-2 space-y-2">
                          {viewDetail.candidateProfile.workExperience.map((exp, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border border-line bg-surface-muted/50"
                            >
                              <p className="font-medium text-content">{exp.company}</p>
                              {exp.jobTitle && (
                                <p className="text-sm text-content-muted">{exp.jobTitle}</p>
                              )}
                              <p className="text-xs text-content-faint">
                                {exp.startDate ? formatDate(exp.startDate) : '?'} -{' '}
                                {exp.isCurrent
                                  ? 'Present'
                                  : exp.endDate
                                    ? formatDate(exp.endDate)
                                    : '?'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewDetail.candidateProfile.education?.length && (
                      <div>
                        <h4 className="font-medium text-content">Education</h4>
                        <div className="mt-2 space-y-2">
                          {viewDetail.candidateProfile.education.map((edu, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border border-line bg-surface-muted/50"
                            >
                              <p className="font-medium text-content">{edu.qualification}</p>
                              {edu.institution && (
                                <p className="text-sm text-content-muted">{edu.institution}</p>
                              )}
                              {edu.startYear && (
                                <p className="text-xs text-content-faint">
                                  {edu.startYear} - {edu.endYear || 'Present'}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewDetail.candidateProfile.industries?.length && (
                      <div>
                        <h4 className="font-medium text-content">Industries</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewDetail.candidateProfile.industries.map((ind) => (
                            <Badge key={ind} variant="info" className="text-[10px]">
                              {ind}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewDetail.candidateProfile.functionalAreas?.length && (
                      <div>
                        <h4 className="font-medium text-content">Functional Areas</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewDetail.candidateProfile.functionalAreas.map((area) => (
                            <Badge key={area} variant="info" className="text-[10px]">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {viewDetail.extractionError && (
                  <div className="border-t border-line pt-4">
                    <h3 className="font-semibold text-content">Extraction Error</h3>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {viewDetail.extractionError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
