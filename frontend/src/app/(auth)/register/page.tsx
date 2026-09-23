"use client"

import { useRegister } from "@/lib/api/auth";
import { apiErrorText } from "@/lib/api/unwrap";
import { useRouter } from "next/navigation";
import { RegisterForm } from "./RegisterForm";
import { RegisterFormValues } from "./register.schema";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();

  const onSubmit = async ({ email, password }: RegisterFormValues) => {
    try {
      await register.mutateAsync({ email, password });
      router.push("/");
    } catch {
      // помилку показує register.error нижче, вдруге її не обробляємо
    }
  };

  return (
    <RegisterForm
      onSubmit={onSubmit}
      isSubmitting={register.isPending}
      submitError={register.error ? apiErrorText(register.error) : null}
    />
  );
}
