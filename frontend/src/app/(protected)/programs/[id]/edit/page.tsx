"use client";

import { useParams, useRouter } from "next/navigation";
import { useProgramQuery, useUpdateProgramMutation } from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import { ProgramForm } from "../../_form/ProgramForm";
import { toUpdateProgramBody } from "../../_form/program.schema";

export default function EditProgramPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Layout рендерить сторінку лише тоді, коли програма вже в кеші, тож тут
  // це читання з кешу, а не новий запит
  const { data: program } = useProgramQuery(id);
  const updateProgram = useUpdateProgramMutation(id);

  return (
    <ProgramForm
      basePath={`/programs/${id}/edit`}
      backHref="/"
      title="Редагування"
      subtitle={program?.name ?? ""}
      submitLabel="Зберегти зміни"
      error={
        updateProgram.error
          ? `Не вдалося зберегти зміни. ${apiErrorText(updateProgram.error)}`
          : null
      }
      onSave={async (values) => {
        await updateProgram.mutateAsync(toUpdateProgramBody(values));
        router.push("/");
      }}
    />
  );
}
