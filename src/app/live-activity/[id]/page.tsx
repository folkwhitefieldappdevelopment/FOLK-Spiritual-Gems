import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /live-activity/details?id=...
 */
export async function generateStaticParams() {
  return [{ id: 'active' }];
}

export default function RedundantPage() { 
    return null; 
}
