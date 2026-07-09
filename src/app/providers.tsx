'use client';

import * as React from 'react';
import { ThemeProvider } from "../contexts/theme-provider";
import { ConnectivityProvider } from "../contexts/connectivity-context";
import { AuthProvider } from "../contexts/auth-context";
import { SyncStatusIndicator } from "../components/sync-status-indicator";
import { FirebaseErrorListener } from "../components/FirebaseErrorListener";
import { Toaster } from "../components/ui/toaster";
import { SyncManager } from "../components/sync-manager";
import { ToastProvider } from "../contexts/toast-context";
import { ReminderManager } from "../components/ReminderManager";
import { NotificationPermissionPrompt } from "../components/NotificationPermissionPrompt";
import { SplashManager } from "../components/SplashManager";
import { CallerIdOverlay } from "../components/CallerIdOverlay";
import { NativePermissionRequester } from "../components/NativePermissionRequester";

/**
 * Providers (Client Component)
 * Handles hydration of all client-side contexts and native Android permissions.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ToastProvider>
        <AuthProvider>
          <ConnectivityProvider>
            <SyncManager />
            <SplashManager>
              <div className="flex flex-col min-h-screen">
                <NativePermissionRequester />
                <FirebaseErrorListener />
                <SyncStatusIndicator />
                <ReminderManager />
                <NotificationPermissionPrompt />
                <CallerIdOverlay />
                <main className="flex-grow">
                  {children}
                </main>
                <Toaster />
              </div>
            </SplashManager>
          </ConnectivityProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
