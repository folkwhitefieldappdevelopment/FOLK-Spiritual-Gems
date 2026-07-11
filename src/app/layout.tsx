import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

/**
 * Root Layout - CRM Build Synchronization Point
 * Update timestamp: 2024-05-20T12:00:00Z
 */

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FOLK Spiritual Gems',
  description: 'Outreach and Contact Management for FOLK Bangalore.',
};

/**
 * Root Layout (Server Component)
 * Defines metadata and viewport while delegating client logic to Providers.
 * Next.js 15 requires metadata to be in a Server Component.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}