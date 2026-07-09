import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /co-enabler/?id=...
 */
export async function generateStaticParams() {
  return [{ id: 'portal' }];
}

export default function CoEnablerStub() {
    return null;
}
