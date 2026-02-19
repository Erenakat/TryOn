import { Platform } from 'react-native';

// AI-backend URL – sett til din deploy-URL (Railway, Render, etc.)
// Lokalt: 'http://10.0.2.2:8000' (Android) / 'http://localhost:8000' (iOS)
const AI_BACKEND_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:8000',
      ios: 'http://localhost:8000',
      default: 'http://localhost:8000',
    })
  : 'https://din-ai-backend.up.railway.app';

export { AI_BACKEND_URL };
