import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "過失割合計算機 - Fault Assessment Calculator",
  description: "交通事故の過失割合を計算するシステム",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "過失割合計算機",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="mobile-scroll">{children}</body>
    </html>
  );
}

