"use client"

import { LoginForm } from "./LoginForm";
import { useLogin } from "@/lib/api/auth";
import { apiErrorText } from "@/lib/api/unwrap";
import type { LoginFormValues } from "./login.schema";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();

  const onSubmit = async (formData: LoginFormValues) => {
    try {
      await login.mutateAsync(formData);
      router.push("/");
    } catch {
      // помилку показує login.error нижче, вдруге її не обробляємо
    }
  };

  return (
    <LoginForm
      onSubmit={onSubmit}
      isSubmitting={login.isPending}
      submitError={login.error ? apiErrorText(login.error) : null}
    />
  );
}
