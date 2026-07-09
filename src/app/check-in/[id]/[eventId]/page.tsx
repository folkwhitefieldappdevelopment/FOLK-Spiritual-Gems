import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /check-in/event/?groupId=...&eventId=...
 */
export async function generateStaticParams() {
  return [
    { id: 'view', eventId: 'entry' },
    { id: 'group', eventId: 'session' }
  ];
}

export default function EventCheckInStub() {
    return null;
}