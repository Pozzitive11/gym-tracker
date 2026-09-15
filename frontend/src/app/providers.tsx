'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // useState, а не модульна змінна: інакше в SSR один QueryClient шарився б
  // між запитами різних користувачів, і кеш одного протікав би до іншого
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // дані тренувань не змінюються самі по собі, поки юзер нічого
            // не робить — агресивний рефетч тут тільки з'їдав би трафік
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
