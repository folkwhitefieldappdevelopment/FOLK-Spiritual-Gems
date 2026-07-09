import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /contacts/profile?id=...
 */
export async function generateStaticParams() {
  return [{ id: 'details' }];
}

export default function RedundantPage() { 
    return null; 
}
