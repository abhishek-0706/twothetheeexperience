import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppBar from "@/components/AppBar";
import BottomNav from "@/components/BottomNav";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "twothetheeexperience — Celebration & Event Planner",
  description:
    "GenAI-powered planning assistant for weddings, birthdays, and community events. Budget, timeline, vendors, and personalized ideas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`light ${playfair.variable} ${jakarta.variable}`}>
      <head>
        {/* Material Symbols is a variable icon font that next/font cannot subset; the
            no-page-custom-font rule targets pages/_document and misfires in the App Router. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-on-primary focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AppBar />
        {/* Skip-link target. Each page renders its own <main> landmark inside this wrapper. */}
        <div id="main-content" tabIndex={-1} className="focus:outline-none">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
