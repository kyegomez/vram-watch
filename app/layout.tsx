import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import Tape from "@/components/Tape";
import { SOURCES } from "@/lib/sources";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "VRAMWATCH — GPU price aggregator",
  description:
    "Street prices for gaming and AI GPUs, aggregated across eBay, Micro Center, Newegg, Amazon, B&H and Supermicro resellers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrains.variable} plane min-h-screen`}
      >
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="group flex items-baseline gap-2.5">
              <span
                aria-hidden
                className="inline-block h-3 w-3 translate-y-[-1px] bg-acc transition-transform group-hover:scale-110"
              />
              <span className="text-lg font-semibold tracking-[0.18em]">
                VRAMWATCH
              </span>
            </Link>
            <p className="font-mono text-xs text-mute">
              USD · live street prices
            </p>
          </div>
        </header>

        <Tape />

        <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">{children}</main>

        <footer className="border-t border-edge">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 font-mono text-xs text-mute sm:px-6">
            <p>Sources: {SOURCES.map((s) => s.name).join(" · ")}.</p>
            <p>
              Prices update automatically and reflect the lowest matching
              listing at each source. Availability and final pricing are set by
              the seller — buy links go straight to the listing.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
