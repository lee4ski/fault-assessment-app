import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "過失割合計算機 - Fault Assessment Calculator",
  description: "交通事故の過失割合を計算するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

