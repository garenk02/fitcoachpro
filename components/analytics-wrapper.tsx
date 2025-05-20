'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Analytics component to avoid SSR issues
const AnalyticsComponent = dynamic(
  () => import('@vercel/analytics/next').then((mod) => mod.Analytics),
  { ssr: false }
);

export function AnalyticsWrapper() {
  return <AnalyticsComponent />;
}
