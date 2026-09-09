// Тимчасова сторінка: показує перенесені дизайн-токени на реальних
// елементах. Видалити, коли з'явиться справжній головний екран.
const palette = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["line", "bg-line"],
  ["dim", "bg-dim"],
  ["accent", "bg-accent"],
  ["warn", "bg-warn"],
  ["danger", "bg-danger"],
] as const;

const radii = [
  ["control", "rounded-control"],
  ["field", "rounded-field"],
  ["card", "rounded-card"],
  ["panel", "rounded-panel"],
] as const;

export default function Home() {
  return (
    <>
      <header className="flex flex-none items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3">
        <h1 className="font-display text-[19px] font-bold tracking-title">
          Дизайн-токени
        </h1>
        <span className="text-label text-dim tabular-nums">IRON</span>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <section className="mt-1 rounded-panel bg-surface px-5 pt-[22px] pb-5">
          <p className="text-tag font-semibold tracking-kicker text-accent uppercase">
            Наступне тренування
          </p>
          <p className="mt-2.5 mb-0.5 font-display text-[34px] font-extrabold tracking-display">
            День A
          </p>
          <p className="mb-4 text-body text-dim">Груди · Трицепс · Плечі</p>
          <button className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975]">
            Почати
          </button>
        </section>

        <h2 className="px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
          Кольори
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {palette.map(([name, bg]) => (
            <div key={name}>
              <div
                className={`${bg} h-14 rounded-control inset-ring-1 inset-ring-line`}
              />
              <p className="mt-1.5 text-micro text-dim-2">{name}</p>
            </div>
          ))}
        </div>

        <h2 className="px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
          Контроль ваги
        </h2>
        <div className="rounded-panel bg-surface p-5">
          <div className="flex items-center justify-between gap-2.5">
            <button className="h-[74px] w-[74px] flex-none rounded-[20px] bg-surface-2 font-display text-label font-bold tabular-nums transition-transform duration-100 ease-out active:scale-[.93] active:bg-surface-3">
              −2.5
            </button>
            <div className="min-w-0 flex-1 text-center">
              <span className="block font-display text-dial font-extrabold tracking-dial tabular-nums">
                82.5
              </span>
              <span className="mt-1.5 block text-tag font-semibold tracking-label text-dim uppercase">
                кг
              </span>
            </div>
            <button className="h-[74px] w-[74px] flex-none rounded-[20px] bg-surface-2 font-display text-label font-bold tabular-nums transition-transform duration-100 ease-out active:scale-[.93] active:bg-surface-3">
              +2.5
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="grid h-13 flex-1 place-items-center rounded-control bg-surface-2 text-label font-semibold tabular-nums">
              82.5 × 8
            </div>
            <div className="grid h-13 flex-1 place-items-center rounded-control text-label font-semibold text-warn tabular-nums inset-ring-1 inset-ring-warn/45">
              80 × 6
            </div>
            <div className="grid h-13 flex-1 place-items-center rounded-control text-label font-semibold text-dim-2 tabular-nums inset-ring-1 inset-ring-line">
              —
            </div>
          </div>
        </div>

        <h2 className="px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
          Радіуси
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {radii.map(([name, r]) => (
            <div key={name}>
              <div className={`${r} h-14 bg-surface-2`} />
              <p className="mt-1.5 text-micro text-dim-2">{name}</p>
            </div>
          ))}
        </div>

        <h2 className="px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
          Текст
        </h2>
        <div className="rounded-card bg-surface p-4">
          <p className="font-display text-[26px] font-extrabold tracking-display">
            Unbounded — заголовки
          </p>
          <p className="mt-2 text-body">Onest — основний текст, 14.5px</p>
          <p className="mt-1 text-meta text-dim">
            Другорядний рядок, 12.5px, колір dim
          </p>
          <p className="mt-3 rounded-chip bg-accent/10 px-3.5 py-3 text-label font-semibold text-accent">
            +2.5 кг до минулого разу
          </p>
        </div>
      </div>
    </>
  );
}
