import { ProgramDayEditor } from "../../../../_form/ProgramDayEditor";

export default async function EditProgramDayPage({
  params,
}: PageProps<"/programs/[id]/edit/days/[index]">) {
  const { id } = await params;
  return <ProgramDayEditor basePath={`/programs/${id}/edit`} />;
}
