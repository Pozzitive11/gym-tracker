import type { ReactNode } from "react";

// Липка панель дій унизу екрана: замінює таб-бар на екранах, де юзер
// заповнює форму, а не навігує між вкладками.
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex-none border-t border-line bg-bg/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] backdrop-blur-xl">
      {children}
    </div>
  );
}
