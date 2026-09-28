import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#F3F4F8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Home Fácil Pro",
  description: "Gerencie seus serviços e ganhe mais.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Home Fácil Pro',
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
