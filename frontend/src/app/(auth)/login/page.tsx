"use client"

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { api } from "@/lib/api/client";
import type { LoginFormValues } from "./login.schema";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setAuthenticated } = useAuthStore();
  const onSubmit = async (formData: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);
    const { data, error } = await api.POST("/auth/login", { body: formData });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setAuthenticated(data.accessToken);

    router.push("/");
  };

  return (
    <LoginForm
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitError={error}
    />
  );
}
