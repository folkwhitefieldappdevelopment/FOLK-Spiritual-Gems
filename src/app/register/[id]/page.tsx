import * as React from 'react';

/**
 * Stub to satisfy Next.js Static Export.
 * The application has been refactored to use search parameters: /register/?id=...
 */
export async function generateStaticParams() {
  // Define a set of static paths that will be pre-rendered during build.
  // This is required for Next.js output: 'export' mode.
  return [
    { id: 'public' },
    { id: 'lead' }
  ];
}

export default function RegistrationStub() {
    return null;
}