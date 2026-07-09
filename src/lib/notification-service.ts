
'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Utility for handling system-level notifications and alarms.
 * Uses Capacitor Local Notifications for reliable background behavior on Android.
 */

const LOGO_URL = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12%202L4.5%209L12%2022L19.5%209L12%202Z%22%2F%3E%3Cpath%20d%3D%22M12%202L9%209L12%2012L15%209L12%202Z%22%2F%3E%3C%20%2Fsvg%3E';

export const isNotificationSupported = () => {
  return Capacitor.isNativePlatform() || (typeof window !== 'undefined' && 'Notification' in window);
};

export const getNotificationPermission = () => {
  if (Capacitor.isNativePlatform()) {
    return (typeof window !== 'undefined' && localStorage.getItem('native_notification_granted') === 'true') ? 'granted' : 'default';
  }
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      const granted = perm.display === 'granted';
      if (granted) localStorage.setItem('native_notification_granted', 'true');
      return granted;
    } catch (e) {
      console.error("LocalNotifications error", e);
      return false;
    }
  }
  
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
};

export const openAppSettings = async () => {
  if (Capacitor.isNativePlatform()) {
    const { App } = await import('@capacitor/app');
  }
};

export const scheduleFollowUpAlarm = async (
  personId: string, 
  name: string, 
  date: Date, 
  remark?: string
) => {
  if (Capacitor.isNativePlatform()) {
    const numericId = Math.abs(personId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericId,
          title: `🔔 Call Reminder: ${name}`,
          body: remark ? `Note: ${remark}` : `Time to follow up with ${name}.`,
          schedule: { at: date, allowWhileIdle: true },
          sound: 'alarm_chime.wav',
          smallIcon: 'ic_stat_name',
          extra: { personId },
        },
      ],
    });
  }
};

export const cancelAlarm = async (personId: string) => {
  if (Capacitor.isNativePlatform()) {
    const numericId = Math.abs(personId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;
    
    await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
  }
};

export const sendNotification = async (title: string, options?: any) => {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body: options?.body || '',
          extra: options?.data || {},
        }
      ]
    });
    return;
  }

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

  const defaultOptions = {
    icon: LOGO_URL,
    badge: LOGO_URL,
    tag: options?.tag || 'sg-notif',
    ...options,
  };

  // Only attempt to show notification if service worker is supported
  // We avoid `new window.Notification()` because it throws "Illegal constructor"
  // when the app is embedded in an iframe (e.g. Firebase Studio preview).
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, defaultOptions);
    } catch (e) {
      console.warn('Could not show notification via service worker', e);
    }
  }
};
