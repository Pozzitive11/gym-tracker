import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/auth-store";
import { api } from "./client";
import type { components } from "./schema";
import { unwrap } from "./unwrap";

type LoginBody = components["schemas"]["LoginDto"];
type RegisterBody = components["schemas"]["RegisterDto"];

export function useLogin() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation({
    mutationFn: async (body: LoginBody) =>
      unwrap(await api.POST("/auth/login", { body })),
    onSuccess: (data) => setAuthenticated(data.accessToken),
  });
}

export function useRegister() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation({
    mutationFn: async (body: RegisterBody) =>
      unwrap(await api.POST("/auth/register", { body })),
    onSuccess: (data) => setAuthenticated(data.accessToken),
  });
}
