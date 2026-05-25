import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Allo Inventory — Reserve Before You Miss Out",
  description:
    "A real-time inventory reservation platform. Hold items at checkout, confirm on payment, and never get double-sold on a product.",
  keywords: ["inventory", "reservation", "checkout", "ecommerce"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Allo<span className="text-violet-400">Inventory</span>
              </span>
            </a>
            <nav className="flex items-center gap-6 text-sm text-white/60">
              <a
                href="/"
                className="hover:text-white transition-colors duration-200"
              >
                Products
              </a>
              <span className="h-4 w-px bg-white/20" />
              <a
                href="https://github.com/theatharvagai/allo-health-project"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors duration-200"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>

        <footer className="border-t border-white/10 bg-black/60 py-8 text-center text-sm text-white/30">
          <p>
            Built for{" "}
            <span className="text-violet-400">Allo Engineering</span> take-home
            exercise
          </p>
        </footer>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
