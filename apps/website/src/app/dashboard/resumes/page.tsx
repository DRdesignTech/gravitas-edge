'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMyResumes } from '@/lib/services';
import { Resume } from '@/lib/types';
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
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { BriefcaseIcon } from '@/components/cards';
import { uploadFile } from '@/lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isValidFile(file: File) {
  const acceptedExtensions = ['.pdf', '.doc', '.docx'];
  const hasAcceptedExtension = acceptedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAcceptedExtension) {
    return {
      valid: false,
      message: 'Unsupported file type. Only PDF, DOC, and DOCX are allowed.',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: 'File size must be less than 5 MB.' };
  }
  return { valid: true };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' bytes';
}

export default function ResumesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [listError, setListError] = useState('');

  const loadResumes = async () => {
    setListError('');
    try {
      const data = await fetchMyResumes();
      const resumesData = Array.isArray(data) ? data : [];
      setResumes(resumesData);
    } catch (e: any) {
      setListError(e?.message || 'Failed to load resumes');
      showToast(e?.message || 'Failed to load resumes', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = isValidFile(file);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }
    setFile(file);
    showToast(`Selected: ${file.name} (${formatFileSize(file.size)})`, 'info');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;

    const validation = isValidFile(file);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }

    setUploading(true);

    try {
      await uploadFile(`/resumes`, file, 'resume');
      showToast('Resume uploaded successfully', 'success');
      await loadResumes();
    } catch (e: any) {
      showToast(e?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const doDelete = async (resumeId: string) => {
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + `/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showToast('Resume deleted successfully', 'success');
      await loadResumes();
    } catch (e: any) {
      showToast(e?.message || 'Deletion failed', 'error');
    }
  };

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  useEffect(() => {
    loadResumes();
  }, []);

  return (
    <div>
      <PageHeader title="Resumes" subtitle={user?.email || ''} />

      {listError ? (
        <ErrorState message={listError} onRetry={loadResumes} />
      ) : (
        <Card className="mt-6">
          <div className="px-6 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-base font-semibold text-content mb-3">Upload Resume</h3>
                {uploading ? (
                  <LoadingSpinner label="Uploading resume..." />
                ) : (
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="w-full"
                        aria-label="Upload resume file (PDF, DOC, DOCX, max 5MB)"
                      />
                      {file && (
                        <div className="mt-2 flex items-center justify-between text-xs text-content-muted">
                          <span>{file.name}</span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <Button type="submit" disabled={uploading}>
                        {uploading ? 'Uploading…' : 'Upload Resume'}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>

              <Card>
                <h3 className="text-base font-semibold text-content mb-3">Your Resumes</h3>

                {resumes.length === 0 ? (
                  <EmptyState
                    title="No resumes uploaded"
                    description="Upload a resume to apply for opportunities and enhance your profile."
                    icon={<BriefcaseIcon className="h-6 w-6 text-content-muted" />}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table<Resume>
                      columns={[
                        { key: 'originalName', label: 'Filename' },
                        { key: 'fileType', label: 'Type' },
                        {
                          key: 'fileSize',
                          label: 'Size',
                          render: (item) => {
                            const size = item.fileSize;
                            if (size >= 1024 * 1024) {
                              return (size / (1024 * 1024)).toFixed(1) + ' MB';
                            }
                            return (size / 1024).toFixed(1) + ' KB';
                          },
                        },
                        {
                          key: 'uploadedAt',
                          label: 'Uploaded',
                          render: (item) => formatDate(item.uploadedAt),
                        },
                        {
                          key: 'uploadStatus',
                          label: 'Status',
                          render: (item) => {
                            if (item.uploadStatus) {
                              return <StatusBadge status={item.uploadStatus} />;
                            }
                            return '—';
                          },
                        },
                        {
                          key: 'actions',
                          label: 'Actions',
                          render: (item) => {
                            return (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/resumes/${item.id}`, '_blank')}
                                  className="flex items-center gap-1"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setDeleteId(item.id)}
                                  className="flex items-center gap-1"
                                >
                                  Delete
                                </Button>
                              </div>
                            );
                          },
                        },
                      ]}
                      data={resumes}
                      rowKey={(item) => item.id}
                      emptyMessage="No resumes found"
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Card>
      )}

      {deleteId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteId(null)}
          onConfirm={() => doDelete(deleteId)}
          title="Delete Resume"
          message="Are you sure you want to delete this resume?"
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
