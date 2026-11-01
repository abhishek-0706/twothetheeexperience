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
    <html lang="en" className="light">
      <head>
        {/* Prototype: CDN fonts. Replace with next/font for production. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <AppBar />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
