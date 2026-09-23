interface HomeHeaderProps {
  programName: string;
  date: Date;
}

export function HomeHeader({ programName, date }: HomeHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return (
    <header className="flex flex-none items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3">
      <div>
        <h1 className="font-display text-[19px] font-bold tracking-title">
          {programName}
        </h1>
        <p className="text-label text-dim tabular-nums">{formattedDate}</p>
      </div>
    </header>
  );
}
