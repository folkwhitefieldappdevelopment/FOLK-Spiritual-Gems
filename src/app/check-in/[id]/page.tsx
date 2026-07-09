import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /check-in/?groupId=...
 */
export async function generateStaticParams() {
  // Pre-render a few static path placeholders to unblock the export process.
  return [
    { id: 'view' },
    { id: 'attendance' }
  ];
}

export default function CheckInStub() {
    return null;
}