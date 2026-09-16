'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { refreshAccessToken } from '../../lib/auth/refresh';

export default function ProtectedLayout({ children }: LayoutProps<'/'>) {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    refreshAccessToken().catch(() => {
      // помилку вже обробив refresh.ts (status -> 'unauthenticated');
      // тут ловимо лише щоб не було unhandled promise rejection
    });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="grid h-full w-full place-items-center bg-bg">
        <span className="text-body text-dim">Завантаження…</span>
      </div>
    );
  }

  return <>{children}</>;
}
