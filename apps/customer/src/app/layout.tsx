import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#FAFCFE',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Home Fácil",
  description: "Sua casa merece um domingo de manhã toda semana.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Home Fácil',
  },
  formatDetection: {
    telephone: false,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>
        <div className="mobile-container">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
