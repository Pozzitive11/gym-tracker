import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z.string().min(1, "Пароль обов'язковий"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
