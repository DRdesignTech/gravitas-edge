'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminGetUser } from '@/lib/services';
import { User } from '@/lib/types';
import { Button, Card, Skeleton, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';
import { StatusBadge } from '@/components/ui';

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<
    Array<{
      id: string;
      originalName: string;
      fileType: string;
      fileSize: number;
      uploadStatus: string;
      uploadedAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const loadUser = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await adminGetUser(id!);
      setUser(userData);
    } catch (err) {
      showToast('Failed to load candidate', 'error');
      router.back();
    }
  };

  const loadResumes = async () => {
    if (!id) return;
    try {
      const resp = await fetch(`/api/resumes?userId=${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      if (!resp.ok) throw new Error('Failed to load resumes');
      const data = await resp.json();
      setResumes(data.data || []);
    } catch (err) {
      showToast('Failed to load resumes', 'error');
    }
  };

  useEffect(() => {
    loadUser();
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!user) {
    return <div>Loading candidate...</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <PageHeader title={user.profile?.fullName || user.email} subtitle={user.email} />

      <Card>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-content">{user.profile?.fullName || user.email}</p>
            <p className="text-sm text-content-muted">{user.email}</p>
            {user.profile?.phone && (
              <p className="mt-1 text-sm text-content-muted">📱 {user.profile.phone}</p>
            )}
            {user.profile?.location && (
              <p className="mt-1 text-sm text-content-muted">📍 {user.profile.location}</p>
            )}
            {user.profile?.yearsExperience !== undefined && (
              <p className="mt-2 text-sm">
                {user.profile.yearsExperience}
                {user.profile.monthsExperience !== undefined
                  ? ` ${user.profile.monthsExperience} months`
                  : ''}{' '}
                yrs experience
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-content">Current Role</p>
            <p className="mt-1 text-content-medium">{user.profile?.currentJobTitle || '—'}</p>
            <p className="mt-1 text-content-medium">{user.profile?.currentCompany || '—'}</p>
            <p className="mt-1 text-sm text-content-muted">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-content">Resumes</p>
          </div>
          <div className="text-right">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/admin/candidates/${id}/resumes`)}
            >
              Manage Resumes
            </Button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <EmptyState
            title="No resumes uploaded"
            description="The candidate has not uploaded any resumes yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-content-muted border-b border-line-strong bg-surface-muted/50">
                  <th className="py-3 w-48">Filename</th>
                  <th className="py-3 w-16">Type</th>
                  <th className="py-3 w-16">Size</th>
                  <th className="py-3 w-16">Uploaded</th>
                  <th className="py-3 w-32">Status</th>
                  <th className="py-3 actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id} className="align-middle border-b border-line-soft">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-content-medium">{r.originalName}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-content-medium">{r.fileType}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-content-medium">
                        {r.fileSize > 1024
                          ? (r.fileSize / 1024).toFixed(1) + ' KB'
                          : r.fileSize + ' bytes'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-content-muted">{formatDate(r.uploadedAt)}</span>
                    </td>
                    <td className="py-4">
                      <StatusBadge value={r.uploadStatus} />
                    </td>
                    <td className="py-4 flex gap-2">
                      <a
                        href={`/api/resumes/${r.id}/download?token=${localStorage.getItem(
                          'admin_token',
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download
                      </a>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          window.confirm('Are you sure you want to delete this resume?')
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
