import { useAuthStore } from './auth-store';
import type { components } from '../api/schema';

type AuthResponse = components['schemas']['AuthResponseDto'];

// Не через lib/api/client.ts навмисно: якщо /auth/refresh сам поверне 401
// (кука прострочена), мідлвара клієнта спробувала б викликати
// refreshAccessToken() ще раз — а refreshPromise нижче вже чекає саме на
// цей виклик. Вийшов би дедлок. Тому — голий fetch, без мідлвари.
async function doRefreshCall(): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    { method: 'POST', credentials: 'include' },
  );

  if (!response.ok) {
    useAuthStore.getState().setUnauthenticated();
    throw new Error(`Refresh failed with status ${response.status}`);
  }

  const data = (await response.json()) as AuthResponse;
  useAuthStore.getState().setAuthenticated(data.accessToken);
  return data.accessToken;
}

let refreshPromise: Promise<string> | null = null;

// Single-flight: паралельні виклики (кілька 401 одночасно, або React
// StrictMode, що монтує ефекти двічі в dev) чекають на той самий запит
// замість того, щоб кожен стартував свій.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefreshCall().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
