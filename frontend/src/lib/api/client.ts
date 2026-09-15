import createClient from 'openapi-fetch';
import type { paths } from './schema';

// Типізований клієнт: шляхи, параметри й тіла беруться зі згенерованої схеми.
// Помилка в назві ендпоїнта або в полі тіла — це помилка компіляції, а не 404
// у рантаймі.
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,

  // refresh-токен лежить у httpOnly-куці, і браузер надішле її лише з цим
  // прапорцем — бо фронт і бекенд на різних портах, тобто крос-origin
  credentials: 'include',
});
