"use client";

import { useRouter } from "next/navigation";
import { useCreateProgramMutation } from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import { ProgramForm } from "../_form/ProgramForm";
import { toCreateProgramBody } from "../_form/program.schema";

export default function NewProgramPage() {
  const router = useRouter();
  const createProgram = useCreateProgramMutation();

  return (
    <ProgramForm
      basePath="/programs/new"
      backHref="/"
      title="Нова програма"
      subtitle="Налаштуй один раз, далі тільки тренуйся"
      submitLabel="Зберегти програму"
      error={
        createProgram.error
          ? `Не вдалося зберегти програму. ${apiErrorText(createProgram.error)}`
          : null
      }
      onSave={async (values) => {
        await createProgram.mutateAsync(toCreateProgramBody(values));
        router.push("/");
      }}
    />
  );
}
