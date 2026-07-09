import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /groups/details?id=...
 */
export async function generateStaticParams() {
  return [{ id: 'view' }];
}

export default function RedundantPage() { 
    return null; 
}
