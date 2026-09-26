"use client";

import { useParams, useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import {
  useDeleteProgramMutation,
  useUpdateProgramMutation,
} from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import { ProgramForm } from "../../_form/ProgramForm";
import {
  toUpdateProgramBody,
  type ProgramFormValues,
} from "../../_form/program.schema";

export default function EditProgramPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const updateProgram = useUpdateProgramMutation(id);
  const deleteProgram = useDeleteProgramMutation(id);
  // Назва для підзаголовка — збережена, з defaultValues форми, а не з
  // useProgramQuery. Сторінка свідомо не підписана на запит програми: після
  // видалення запит прибирається з кешу, і підписаний компонент на
  // наступному рендері пішов би по неї знову — зайвий GET, що впаде в 404
  const {
    formState: { defaultValues },
  } = useFormContext<ProgramFormValues>();

  return (
    <ProgramForm
      basePath={`/programs/${id}/edit`}
      backHref="/"
      title="Редагування"
      subtitle={defaultValues?.name ?? ""}
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
      onDelete={async () => {
        await deleteProgram.mutateAsync();
        // replace, не push: «назад» з головної не має вести на екран
        // редагування програми, якої вже нема
        router.replace("/");
      }}
      // isSuccess теж: між відповіддю сервера і переходом на головну кнопка
      // не має оживати — повторний тап дав би DELETE з 404
      isDeleting={deleteProgram.isPending || deleteProgram.isSuccess}
      deleteError={
        deleteProgram.error
          ? `Не вдалося видалити програму. ${apiErrorText(deleteProgram.error)}`
          : null
      }
    />
  );
}
