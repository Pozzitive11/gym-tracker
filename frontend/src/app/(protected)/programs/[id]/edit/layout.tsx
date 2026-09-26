"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useProgramQuery } from "@/lib/api/programs";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/unwrap";
import { ScreenHeader } from "../../_form/ScreenHeader";
import {
  programSchema,
  toFormValues,
  type ProgramFormValues,
} from "../../_form/program.schema";

type ProgramResponse = components["schemas"]["ProgramResponseDto"];

// Той самий принцип, що в new/layout.tsx: layout живе, поки юзер ходить між
// формою і редакторами днів, і тримає форму. Різниця лише в тому, звідки
// defaultValues — тут це програма з сервера.
export default function EditProgramLayout({
  children,
}: LayoutProps<"/programs/[id]/edit">) {
  const { id } = useParams<{ id: string }>();
  const { data: program, isPending, error, refetch } = useProgramQuery(id);

  // Спершу дані, потім помилка: якщо фоновий рефетч (фокус вкладки) впаде
  // посеред редагування, status стане error, але data лишиться — форму з
  // правками юзера не розмонтовуємо
  if (program) {
    return (
      <EditProgramForm key={program.id} program={program}>
        {children}
      </EditProgramForm>
    );
  }
  if (isPending) return <Loading />;

  // 400 — id не схожий на uuid (ParseUUIDPipe), 404 — нема або чужа програма.
  // Для юзера це одне й те саме
  const notFound =
    error instanceof ApiError && (error.status === 404 || error.status === 400);
  return <LoadError notFound={notFound} onRetry={() => refetch()} />;
}

// Окремий компонент, щоб useForm викликався лише тоді, коли дані вже є:
// defaultValues читаються один раз, на першому рендері. Пізніші оновлення
// кешу (фоновий рефетч) форму не чіпають — правки юзера не затираються
function EditProgramForm({
  program,
  children,
}: {
  program: ProgramResponse;
  children: ReactNode;
}) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: toFormValues(program),
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}

function Loading() {
  return (
    <div className="grid flex-1 place-items-center">
      <span className="text-body text-dim">Завантаження…</span>
    </div>
  );
}

function LoadError({
  notFound,
  onRetry,
}: {
  notFound: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Редагування" backHref="/" />
      <div className="grid flex-1 place-items-center px-6 pb-16 text-center">
        <div>
          <p className="text-body text-dim">
            {notFound
              ? "Такої програми нема. Можливо, її вже видалили."
              : "Не вдалося завантажити програму."}
          </p>
          {notFound ? (
            <Link
              href="/"
              className="mt-4 inline-grid h-12 place-items-center rounded-card bg-surface px-6 text-label font-semibold text-text transition-transform duration-150 ease-out active:scale-[.975]"
            >
              На головну
            </Link>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 h-12 rounded-card bg-surface px-6 text-label font-semibold text-text transition-transform duration-150 ease-out active:scale-[.975]"
            >
              Спробувати ще раз
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
