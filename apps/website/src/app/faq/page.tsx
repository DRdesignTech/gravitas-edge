import type { Metadata } from 'next';
import { Suspense } from 'react';
import FaqPage from './FaqPage';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Gravitas Edge Consulting',
  description:
    'Find answers to common questions about Gravitas Edge Consulting, our opportunity vaults, subscriptions, hiring contacts, and how the platform works.',
  openGraph: {
    title: 'Frequently Asked Questions — Gravitas Edge Consulting',
    description:
      'Everything you need to know about Gravitas Edge, our opportunity access, subscriptions, hiring contacts and how the platform works.',
  },
};

export default function Page() {
  return (
    <Suspense>
      <FaqPage />
    </Suspense>
  );
}
