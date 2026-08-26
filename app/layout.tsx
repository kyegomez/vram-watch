import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Tape from "@/components/Tape";
import { jsonLdGraph, organizationSchema, websiteSchema } from "@/lib/seo";
import {
  BRAND_BG,
  BRAND_COLOR,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/site";
import { SOURCES } from "@/lib/sources";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "technology",
  authors: [{ name: "Swarms", url: "https://swarms.world" }],
  creator: "Swarms",
  publisher: "Swarms",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ background: BRAND_BG }}>
      <body
        className={`${spaceGrotesk.variable} ${jetbrains.variable} plane min-h-screen`}
      >
        <JsonLd data={jsonLdGraph(organizationSchema(), websiteSchema())} />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-panel2 focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-acc"
        >
          Skip to content
        </a>

        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              aria-label={`${SITE_NAME} home — ${SITE_TAGLINE}`}
              className="group flex items-baseline gap-2.5"
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 translate-y-[-1px] bg-acc transition-transform group-hover:scale-110"
              />
              <span className="text-lg font-semibold tracking-[0.18em]">
                {SITE_NAME}
              </span>
            </Link>
            <nav aria-label="Main" className="flex items-baseline gap-5">
              <Link
                href="/sources"
                className="font-mono text-xs text-mute transition-colors hover:text-acc"
              >
                sources
              </Link>
              <p className="font-mono text-xs text-mute">USD · live street prices</p>
            </nav>
          </div>
        </header>

        <Tape />

        <main id="main" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          {children}
        </main>

        <footer className="border-t border-edge">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 font-mono text-xs text-mute sm:px-6">
            <p>
              <Link href="/sources" className="hover:text-acc">
                Sources
              </Link>
              : {SOURCES.map((s) => s.name).join(" · ")}.
            </p>
            <p>
              Prices update automatically and reflect the lowest matching
              listing at each source. Availability and final pricing are set by
              the seller — buy links go straight to the listing.
            </p>
            <p>
              <Link href="/" className="hover:text-acc">
                {SITE_NAME}
              </Link>{" "}
              — {SITE_TAGLINE}.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
