"use client";

import Link from "next/link";
import { EmptyHome } from "./EmptyHome";
import { HomeHeader } from "./HomeHeader";
import { ProgramListItem } from "./ProgramListItem";
import { useProgramsQuery } from "@/lib/api/programs";

export default function HomePage() {
  const { data: programs, isPending, isError, refetch } = useProgramsQuery();

  if (isPending) {
    return (
      <div className="grid min-h-full place-items-center">
        <span className="text-body text-dim">Завантаження…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-full place-items-center px-6 text-center">
        <div>
          <p className="text-body text-dim">Не вдалося завантажити програми.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 h-12 rounded-card bg-surface px-6 text-label font-semibold text-text transition-transform duration-150 ease-out active:scale-[.975]"
          >
            Спробувати ще раз
          </button>
        </div>
      </div>
    );
  }

  const activeProgram = programs.find((program) => program.isActive);

  return (
    <div className="flex min-h-full flex-col">
      <HomeHeader
        programName={activeProgram?.name ?? "Тренування"}
        date={new Date()}
      />

      {programs.length === 0 ? (
        <EmptyHome />
      ) : (
        <section className="px-5 pb-6">
          <h2 className="px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
            Програми
          </h2>
          {programs.map((program) => (
            <ProgramListItem
              key={program.id}
              href={`/programs/${program.id}/edit`}
              name={program.name}
              dayCount={program.dayCount}
              exerciseCount={program.exerciseCount}
              isActive={program.isActive}
            />
          ))}
          <Link
            href="/programs/new"
            className="block w-full p-4 text-center text-label font-medium text-dim transition-colors hover:text-text active:text-text"
          >
            + Нова програма
          </Link>
        </section>
      )}
    </div>
  );
}
