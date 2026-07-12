import * as React from 'react';
import CheckInClient from './CheckInClient';

/**
 * Legacy dynamic route handler.
 * Permanently redirects visitors from /check-in/{id} to the new /check-in/?groupId={id} flow.
 * This ensures that old QR codes remain functional.
 */
export async function generateStaticParams() {
  // Pre-render a few static path placeholders to unblock the export process.
  return [
    { id: 'view' },
    { id: 'attendance' }
  ];
}

export default async function CheckInLegacyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CheckInClient groupId={id} />;
}
