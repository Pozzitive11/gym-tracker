"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "./login.schema";



export interface LoginFormProps {
  onSubmit: (data: LoginFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

export function LoginForm({
  onSubmit,
  isSubmitting,
  submitError,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <div className="flex h-full w-full flex-col justify-center px-6 pb-10">
      <p className="font-display text-[27px] font-extrabold tracking-display">
        Увійти
      </p>
      <p className="mt-2 mb-8 text-body text-dim">
        Продовж записувати тренування там, де зупинився.
      </p>

      {submitError && (
        <div className="mb-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
          {submitError}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Email
          </label>
          <input
            id="login-email"
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
            htmlFor="login-password"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
          {form.formState.errors.password && (
            <p className="mt-2 text-meta text-warn">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? "Входимо…" : "Увійти"}
        </button>
      </form>

      <p className="mt-6 text-center text-label text-dim">
        Немає акаунту?{" "}
        <Link href="/register" className="font-semibold text-accent">
          Зареєструватися
        </Link>
      </p>
    </div>
  );
}
