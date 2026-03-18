import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "AI Debate",
  description: "Watch AI models debate any topic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geist.variable}`}>
      <body className="antialiased">
        <TooltipProvider>
          <Nav />
          <main>{children}</main>
        </TooltipProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
