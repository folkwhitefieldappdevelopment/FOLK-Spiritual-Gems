
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface CallLogEntry {
  id: string;
  type: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'UNKNOWN';
  phoneNumber: string;
  duration: number;
  timestamp: number;
}

export interface CallLogPlugin {
  requestPermissions(): Promise<{
    callLog: string;
    camera: string;
    contacts: string;
    notifications: string;
  }>;

  checkPermissions(): Promise<{
    callLog: string;
    camera: string;
    contacts: string;
    notifications: string;
    overlay: string;
  }>;

  requestOverlayPermission(): Promise<void>;

  requestBatteryExemption(): Promise<void>;

  getCallLog(options: {
    contactPhoneNumber?: string;
    lastSyncTimestamp?: number;
  }): Promise<{ callLog: CallLogEntry[] }>;

  makeCall(options: {
    phoneNumber: string;
  }): Promise<void>;

  showNativeOverlay(options: {
    name: string;
    phone: string;
    photoUrl: string;
    stage: string;
    remark: string;
    type: string;
  }): Promise<void>;

  hideNativeOverlay(): Promise<void>;

  addListener(
    eventName: 'callDetected',
    listenerFunc: (data: { phoneNumber: string; type: 'INCOMING' | 'OUTGOING' | 'DISCONNECTED' }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'nativeOverlayAction',
    listenerFunc: (data: { action: 'startSession' | 'viewProfile' }) => void
  ): Promise<PluginListenerHandle>;
}

const CallLog = registerPlugin<CallLogPlugin>('CallLog');

export { CallLog };
