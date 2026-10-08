/**
 * Centralised env access. Nothing secret should ever live here —
 * this bundle is shipped to the browser.
 */
const read = (key, fallback = '') => {
  const v = import.meta.env[key];
  return v === undefined || v === '' ? fallback : v;
};

export const env = {
  apiUrl: read('VITE_API_URL', '/api'),
  appName: read('VITE_APP_NAME', 'Sokoni'),
  appEnv: read('VITE_APP_ENV', 'development'),
  isProd: read('VITE_APP_ENV', 'development') === 'production',
};