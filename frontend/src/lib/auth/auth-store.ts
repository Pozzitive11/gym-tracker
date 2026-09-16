import { create } from 'zustand';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
  setAuthenticated: (accessToken: string) => void;
  setUnauthenticated: () => void;
}

// accessToken живе тільки тут, у пам'яті — ніколи в localStorage чи куці.
// Причина в docs/superpowers/specs/2026-09-16-frontend-auth-design.md
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  status: 'loading',
  setAuthenticated: (accessToken) =>
    set({ accessToken, status: 'authenticated' }),
  setUnauthenticated: () => set({ accessToken: null, status: 'unauthenticated' }),
}));
