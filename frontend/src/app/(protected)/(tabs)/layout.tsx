import { TabBar } from "./TabBar";

// Таб-бар лише на екранах-вкладках (головна, прогрес, вправи). Екрани
// створення програми й тренування мають власну липку панель дій, тож
// живуть поза цією групою.
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
      <TabBar />
    </>
  );
}
