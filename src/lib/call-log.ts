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
    outgoingCalls: string;
  }>;

  checkPermissions(): Promise<{
    callLog: string;
    camera: string;
    contacts: string;
    notifications: string;
    overlay: string;
    outgoingCalls: string;
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

  syncNativeContactCache(options: {
    json: string;
  }): Promise<void>;

  showNativeOverlay(options: {
    name: string;
    phone: string;
    photoUrl: string;
    stage: string;
    remark: string;
    type: string;
    occupation?: string;
    enabler?: string;
    folkGuide?: string;
    attendance?: string[];
    isAdmin?: boolean;
    chantingStatus?: number;
    sessionId?: string;
    currentIndex?: number;
    sessionName?: string;
  }): Promise<{ shown: boolean }>;

  hideNativeOverlay(): Promise<void>;

  addListener(
    eventName: 'callDetected',
    listenerFunc: (data: { phoneNumber: string; type: 'INCOMING' | 'OUTGOING' | 'DISCONNECTED' }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'nativeOverlayAction',
    listenerFunc: (data: { 
      action: 'startSession' | 'viewProfile' | 'resumeSession';
      sessionId?: string;
      currentIndex?: number;
    }) => void
  ): Promise<PluginListenerHandle>;
}

const CallLog = registerPlugin<CallLogPlugin>('CallLog');

export { CallLog };
