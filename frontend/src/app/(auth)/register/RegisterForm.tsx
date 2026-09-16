"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { registerSchema, type RegisterFormValues } from "./register.schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

export function RegisterForm({
  onSubmit,
  isSubmitting,
  submitError,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 pb-10">
      <p className="font-display text-[27px] font-extrabold tracking-display">
        Реєстрація
      </p>
      <p className="mt-2 mb-8 text-body text-dim">
        Один акаунт — програма вдома і підходи в залі синхронізовані.
      </p>

      {submitError && (
        <div className="mb-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
          {submitError}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label
            htmlFor="register-email"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            className="h-[58px] w-full rounded-field bg-surface px-4 text-lead text-text outline-none inset-ring-1 inset-ring-line focus:inset-ring-2 focus:inset-ring-accent"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="mt-2 text-meta text-warn">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="register-password"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="h-[58px] w-full rounded-field bg-surface pl-4 pr-12 text-lead text-text outline-none inset-ring-1 inset-ring-line focus:inset-ring-2 focus:inset-ring-accent"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-dim transition-colors hover:text-text"
              aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.formState.errors.password ? (
            <p className="mt-2 text-meta text-warn">
              {form.formState.errors.password.message}
            </p>
          ) : (
            <p className="mt-2 text-meta text-dim">Щонайменше 8 символів</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="register-confirm-password"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Підтвердження пароля
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              className="h-[58px] w-full rounded-field bg-surface pl-4 pr-12 text-lead text-text outline-none inset-ring-1 inset-ring-line focus:inset-ring-2 focus:inset-ring-accent"
              {...form.register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-dim transition-colors hover:text-text"
              aria-label={showConfirmPassword ? "Сховати пароль" : "Показати пароль"}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="mt-2 text-meta text-warn">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? "Створюємо…" : "Зареєструватися"}
        </button>
      </form>

      <p className="mt-6 text-center text-label text-dim">
        Вже є акаунт?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Увійти
        </Link>
      </p>
    </div>
  );
}
