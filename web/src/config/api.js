export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const SOCKET_URL = API_BASE_URL || '/';

export function setupApiInterceptor() {
  if (API_BASE_URL) {
    const originalFetch = window.fetch;
    window.fetch = (input, init) => {
      if (typeof input === 'string') {
        if (input.startsWith('/api') || input.startsWith('/uploads')) {
          input = `${API_BASE_URL}${input}`;
        }
      }
      return originalFetch(input, init);
    };
    console.log(`[API] Live backend URL connected: ${API_BASE_URL}`);
  }
}
