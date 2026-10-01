"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { programsQueryOptions } from "@/lib/api/programs";
import { newId } from "@/lib/id";
import { programSchema, type ProgramFormValues } from "../_form/program.schema";

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

  // Немає жодної активної програми — нова за замовчуванням стає активною,
  // інакше на головній нема з чого почати тренування. Це лише стартове
  // значення перемикача у формі, юзер бачить його й може вимкнути.
  // Список програм зазвичай уже в кеші (юзер прийшов з головної). Якщо ні
  // (відкрили URL напряму) — не вгадуємо й не відбираємо активність у
  // наявної програми: перемикач вимкнений
  const queryClient = useQueryClient();
  const [startActive] = useState(() => {
    const programs = queryClient.getQueryData(programsQueryOptions.queryKey);
    return programs !== undefined && !programs.some((p) => p.isActive);
  });

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      id: programId,
      name: "",
      isActive: startActive,
      days: [],
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
