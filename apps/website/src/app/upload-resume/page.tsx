'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';

export default function UploadResumePage() {
  const { user } = useAuth();

  return (
    <div className="overflow-hidden">
      <section className="bg-[#0A1730]">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <Eyebrow invert>RESUMES</Eyebrow>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
            Upload your resume.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Keep a copy of your resume with Gravitas Edge so the right opportunities can reach you.
            You can start the upload without an account.
          </p>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-content-muted">
              {user
                ? `Uploading as ${user.email}`
                : 'No account is needed to begin. Add your details below.'}
            </p>
            {user && (
              <Link
                href="/dashboard/resumes"
                className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Manage resumes →
              </Link>
            )}
          </div>

          <ResumeUploadCard
            heading="Upload Your Resume"
            description="Upload your resume to help us understand your profile and keep it available for relevant Gravitas Edge opportunities."
          />
        </div>
      </section>
    </div>
  );
}
