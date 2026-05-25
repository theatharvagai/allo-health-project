import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Allo Health Inventory System",
  description:
    "Real-time pharmacy inventory and reservation platform for Allo Health. Reserve medicines and medical equipment across all Allo Health centres.",
  keywords: ["allo health", "pharmacy", "inventory", "reservation", "medicines", "medical equipment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[#f5f9f5]`}>
        {/* Top Header */}
        <header className="sticky top-0 z-50 border-b border-green-100 bg-white/95 backdrop-blur-xl elevation-1">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-green-400 shadow-md shadow-green-200 group-hover:shadow-green-300 transition-all duration-300">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-green-800">
                  Allo <span className="text-green-500">Health</span>
                </span>
                <p className="text-[10px] text-green-600/70 -mt-0.5 leading-none tracking-wide">
                  INVENTORY SYSTEM
                </p>
              </div>
            </a>

            {/* Nav */}
            <nav className="flex items-center gap-6 text-sm">
              <a href="/" className="text-green-700 font-medium hover:text-green-500 transition-colors duration-200">
                Products
              </a>
              <span className="h-4 w-px bg-green-200" />
              <a
                href="https://github.com/theatharvagai/allo-health-project"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all duration-200 font-medium"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </nav>
          </div>
        </header>

        {/* Recruiter Banner */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 py-2 text-center text-sm text-white">
          <span className="opacity-90">🏥 Allo Health Engineering Take-Home Assessment</span>
          <span className="mx-3 opacity-50">·</span>
          <a
            href="https://github.com/theatharvagai/allo-health-project"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            github.com/theatharvagai/allo-health-project
          </a>
          <span className="mx-3 opacity-50">·</span>
          <span className="opacity-90">Built by Atharva Gai</span>
        </div>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>

        <footer className="border-t border-green-100 bg-white py-6 text-center text-sm text-green-600/60">
          <p>
            allo-health-assessment by{" "}
            <a
              href="https://github.com/theatharvagai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-green-600 hover:text-green-500 transition-colors"
            >
              Atharva Gai
            </a>
            {" "}·{" "}
            <a
              href="https://github.com/theatharvagai/allo-health-project"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-500 transition-colors"
            >
              GitHub Repo
            </a>
          </p>
        </footer>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
