import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reels Factory — AI-ролики для товаров за минуты",
  description:
    "4 вопроса — и готовый рекламный Reels. Платформа для торговых сетей, DIY и локального ритейла.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Reels Factory",
    description: "Массовый недорогой контент для соцсетей",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
