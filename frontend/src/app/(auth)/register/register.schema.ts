import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Невірний email"),
    password: z.string().min(8, "Пароль має містити щонайменше 8 символів"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролі не збігаються",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
