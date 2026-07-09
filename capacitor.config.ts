import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.folkcrm.gems',
  appName: 'FOLK Spiritual Gems',
  webDir: 'out',


  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#E8EAF6'
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3F51B5',
      showSpinner: true,
      androidScaleType: 'CENTER_CROP'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
