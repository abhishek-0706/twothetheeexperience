import type { Metadata } from "next";
import "./globals.css";
import AppBar from "@/components/AppBar";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "twothetheeexperience — Celebration & Event Planner",
  description:
    "GenAI-powered planning assistant for weddings, birthdays, and community events. Budget, timeline, vendors, and personalized ideas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="light">
      <head>
        {/* Prototype: CDN fonts. Replace with next/font for production. The
            no-page-custom-font rule targets pages/_document and misfires in the App Router
            root layout, which already applies to every route. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
