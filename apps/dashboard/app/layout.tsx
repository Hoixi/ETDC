import type { Metadata } from "next";
import { Inter, Rye } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
// Rye — karnaval/vintage display fontu (logo + başlıklar)
const rye = Rye({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "Hoixi · Karnaval",
  description: "Enter The Dark Carnival — yönetim paneli & arena",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${rye.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
