"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { newId } from "@/lib/id";
import { programSchema, type ProgramFormValues } from "./program.schema";

// Layout не перемонтовується при переході між /programs/new і
// /programs/new/days/N — тож форма-чернетка живе, поки юзер у цьому
// піддереві, і зникає разом із ним. F5 чернетку скидає (свідомий компроміс).
export default function NewProgramLayout({
  children,
}: LayoutProps<"/programs/new">) {
  // id програми має бути ОДИН на життя форми: повторне «Зберегти» після
  // втраченої відповіді піде з тим самим id, і бекенд відповість 409 замість
  // створення дубліката. useState із функцією-ініціалізатором викликає newId
  // рівно раз; newId() прямо в defaultValues викликався б на кожному рендері
  // (useForm бере defaultValues лише з першого, але виклик був би марним).
  const [programId] = useState(newId);

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: { id: programId, name: "", isActive: false, days: [] },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
