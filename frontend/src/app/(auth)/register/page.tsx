"use client"

import { useState } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/auth-store";
import { RegisterForm } from "./RegisterForm";
import { RegisterFormValues } from "./register.schema";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setAuthenticated } = useAuthStore();
  const onSubmit = async ({ email, password }: RegisterFormValues) => {
    setError(null);
    setIsSubmitting(true);
    const { data, error } = await api.POST("/auth/register", {
      body: { email, password },
    });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setAuthenticated(data.accessToken);

    router.push("/");
  };

  return (
    <RegisterForm
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitError={error}
    />
  );
}
