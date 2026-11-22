import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duloseditor.app',
  appName: 'Dulos Editor',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'duloseditor.local',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#090a0f',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
