import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Трекер тренувань",
  description: "Програма вдома, підходи в залі, прогрес — в одному місці.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // без цього env(safe-area-inset-*) завжди 0
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${onest.variable} ${unbounded.variable}`}>
      {/* Застосунок займає рівно вікно: прокручуються екрани всередині,
          сама оболонка — ніколи. На десктопі вона сидить у рамці телефона. */}
      <body className="fixed inset-0 grid place-items-center framed:bg-desk framed:p-5">
        <div className="relative flex h-full w-full flex-col overflow-clip framed:h-[844px] framed:w-[390px] framed:rounded-phone framed:shadow-phone">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
