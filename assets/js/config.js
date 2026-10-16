// NEXORA frontend configuration — Created By Shiv Yogi
// No backend URL, password or secret is ever written here.
export const APP_NAME = 'NEXORA';
export const APP_VERSION = '1.0.0';
export const API_PREFIX = '/api/v1';
export const CREATOR = 'Shiv Yogi';
export const PROJECT_URL = 'https://shiv-yogi19.github.io/NEXORA/';

export const KEYS = {
  backend: 'nexora.backendUrl',   // localStorage: non-secret URL only
  token: 'nexora.session',        // sessionStorage: cleared when the tab closes
  prefs: 'nexora.localPrefs',     // localStorage: theme/motion etc. (non-sensitive)
  best: 'nexora.dinoBest',        // localStorage: game best score
  view: 'nexora.libView',         // localStorage: last grid/list choice
};

// ngrok's free tier shows an interstitial for browsers unless this header is sent.
export const NGROK_HEADER = { name: 'ngrok-skip-browser-warning', value: '69420' };
export const NGROK_HOST_RE = /(^|\.)ngrok(-free)?\.(app|io|dev)$/i;

export const REQUEST_TIMEOUT_MS = 20000;
export const HEALTH_TIMEOUT_MS = 8000;
