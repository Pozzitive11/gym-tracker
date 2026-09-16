import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { useAuthStore } from '../auth/auth-store';
import { refreshAccessToken } from '../auth/refresh';

// Типізований клієнт: шляхи, параметри й тіла беруться зі згенерованої схеми.
// Помилка в назві ендпоїнта або в полі тіла — це помилка компіляції, а не 404
// у рантаймі.
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,

  // refresh-токен лежить у httpOnly-куці, і браузер надішле її лише з цим
  // прапорцем — бо фронт і бекенд на різних портах, тобто крос-origin
  credentials: 'include',
});

// 401 тут means "expired access token" ТІЛЬКИ для звичайних ендпоінтів.
// На /auth/login 401 означає "невірний пароль" — рефрешити й повторювати
// такий запит безглуздо й лише замаскує реальну помилку.
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function shouldSkipRetry(url: string): boolean {
  const { pathname } = new URL(url);
  return NO_RETRY_PATHS.some((path) => pathname.endsWith(path));
}

const pendingRequests = new Map<string, Request>();

api.use({
  onRequest({ request, id }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    // Клонуємо ДО того, як openapi-fetch віддасть цей request у fetch() —
    // тіло запиту можна прочитати лише раз; після фактичного fetch()
    // клонувати той самий Request далі не вийде (кине помилку).
    pendingRequests.set(id, request.clone());
    return request;
  },

  async onResponse({ id, response }) {
    const originalRequest = pendingRequests.get(id);
    pendingRequests.delete(id);

    if (response.status !== 401 || !originalRequest || shouldSkipRetry(originalRequest.url)) {
      return response;
    }

    try {
      const newToken = await refreshAccessToken();
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return await fetch(originalRequest);
    } catch {
      // Рефреш упав, АБО сам повторний fetch впав — в обох випадках
      // повертаємо початкову 401-відповідь, стор уже виставлений
      // 'unauthenticated' усередині refreshAccessToken().
      return response;
    }
  },

  onError({ id }) {
    pendingRequests.delete(id);
  },
});
