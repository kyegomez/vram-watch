import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That page isn't on the board. Head back to the live GPU price tracker.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="py-24">
      <p className="font-mono text-xs tracking-widest text-mute uppercase">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Not on the board<span className="text-acc">.</span>
      </h1>
      <p className="mt-3 max-w-lg text-sm text-ink2">
        That page doesn&apos;t exist — the GPU may have been renamed or is not
        tracked. Every part currently tracked is listed on the board.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block border border-edge2 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-acc hover:text-acc"
      >
        Back to the GPU board ↗
      </Link>
    </div>
  );
}
