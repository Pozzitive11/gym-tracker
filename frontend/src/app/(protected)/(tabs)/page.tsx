"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyHome } from "./EmptyHome";
import { HomeHeader } from "./HomeHeader";
import { NextWorkoutCard } from "./NextWorkoutCard";
import { ProgramListItem } from "./ProgramListItem";
import { useProgramsQuery } from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import {
  useActiveWorkoutQuery,
  useNextWorkoutQuery,
  useStartWorkoutMutation,
} from "@/lib/api/workouts";
import { newId } from "@/lib/id";

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
        <>
          <WorkoutCard />
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
        </>
      )}
    </div>
  );
}

// Картка над списком програм. Незавершене тренування важливіше за наступне:
// інакше «Назад» з екрана тренування і повторний тап «Почати» створили б
// друге тренування, кинувши перше
function WorkoutCard() {
  const router = useRouter();
  const { data: active } = useActiveWorkoutQuery();
  const { data: next } = useNextWorkoutQuery();
  const startWorkout = useStartWorkoutMutation();

  if (active) {
    return (
      <NextWorkoutCard
        kicker="Незавершене тренування"
        actionLabel="Продовжити тренування"
        dayName={active.dayName}
        exercises={active.exercises.map((exercise) => exercise.name)}
        onStart={() => router.push("/workout")}
      />
    );
  }

  if (next === undefined) return null; // ще вантажиться
  if (next === null) return <NoActiveProgram />;

  return (
    <NextWorkoutCard
      dayName={next.dayName}
      exercises={next.exerciseNames}
      pending={startWorkout.isPending}
      error={startWorkout.isError ? apiErrorText(startWorkout.error) : null}
      onStart={() =>
        startWorkout.mutate(
          // Новий id на кожен тап. Подвійний тап не створить двох тренувань:
          // поки запит летить, кнопка неактивна (pending)
          { id: newId(), programDayId: next.programDayId },
          { onSuccess: () => router.push("/workout") },
        )
      }
    />
  );
}

// Програми є, а активної нема — без цього головна просто мовчки не мала б
// кнопки старту. Список програм одразу під карткою, тож посилання не треба
function NoActiveProgram() {
  return (
    <div className="mx-5 mt-1 rounded-panel bg-surface px-5 py-5">
      <p className="text-tag font-semibold tracking-kicker text-warn uppercase">
        Нема активної програми
      </p>
      <p className="mt-2.5 text-body leading-relaxed text-dim">
        Відкрий одну з програм нижче й увімкни «Зробити активною» — тут
        зʼявиться наступне тренування.
      </p>
    </div>
  );
}
