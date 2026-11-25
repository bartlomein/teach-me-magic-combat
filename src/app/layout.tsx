import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Atkinson_Hyperlegible_Next, Fraunces, Lexend } from "next/font/google";
import { MotionToggle } from "@/components/MotionToggle";
import { PageTransition } from "@/components/PageTransition";
import { MotionProvider } from "@/lib/motion-pref";
import "./globals.css";

// Lexend: the UI face. Designed to reduce visual stress and improve reading
// fluency (wider letter shapes and spacing), which suits learners with dyslexia.
const ui = Lexend({
  variable: "--font-ui",
  subsets: ["latin"],
});

// Atkinson Hyperlegible: card text and power/toughness numbers (cards keep their design).
const cardText = Atkinson_Hyperlegible_Next({
  variable: "--font-card",
  subsets: ["latin"],
  // Next has no fallback metrics for this newer font yet; skip instead of warning on every build.
  adjustFontFallback: false,
});

// Fraunces: card names only (part of the card design).
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teach Me: Magic Combat",
  description: "Learn Magic: The Gathering combat in about 10 minutes.",
};

export const viewport: Viewport = {
  themeColor: "#eef1f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ui.variable} ${cardText.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <div className="mx-auto flex w-full max-w-[74rem] flex-1 flex-col gap-6 px-3.5 pt-5 pb-10 sm:px-7">
            {/* Named so it stays still while pages slide underneath. */}
            <header
              style={{ viewTransitionName: "site-header" }}
              className="flex items-center justify-between gap-3 border-b-4 border-ink pb-2.5"
            >
              <Link href="/" transitionTypes={["nav-back"]} className="text-[clamp(1.25rem,3vw,1.625rem)] leading-tight font-extrabold tracking-[-0.02em] no-underline">
                Magic combat
              </Link>
              <MotionToggle />
            </header>
            <main className="flex flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            {/* Named so it glides to its new spot when the page height changes, instead of fading over content. */}
            <footer
              style={{ viewTransitionName: "site-footer" }}
              className="mt-auto border-t border-rule pt-4 text-xs leading-relaxed text-ink-soft"
            >
              Teach Me: Magic Combat is unofficial Fan Content permitted under the Fan Content Policy. Not
              approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast.
              ©Wizards of the Coast LLC.
            </footer>
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
