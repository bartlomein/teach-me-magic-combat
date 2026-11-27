import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Atkinson_Hyperlegible_Next, Fraunces, Lexend } from "next/font/google";
import { MotionToggle } from "@/components/ui/MotionToggle";
import { PageTransition } from "@/components/ui/PageTransition";
import { MotionProvider } from "@/lib/motion-pref";
import "./globals.css";

const ui = Lexend({
  variable: "--font-ui",
  subsets: ["latin"],
});

const cardText = Atkinson_Hyperlegible_Next({
  variable: "--font-card",
  subsets: ["latin"],
  // No fallback metrics for this font yet; skip to avoid a warning on every build.
  adjustFontFallback: false,
  // Only cards use it: don't block first paint.
  preload: false,
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  preload: false, // only card names use it
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
            <header
              style={{ viewTransitionName: "site-header" }}
              className="flex items-center justify-between gap-3 border-b-4 border-ink pb-2.5"
            >
              <Link href="/" transitionTypes={["nav-back"]} className="inline-flex min-h-11 items-center text-[clamp(1.25rem,3vw,1.625rem)] leading-tight font-extrabold tracking-[-0.02em] no-underline">
                Magic combat
              </Link>
              <MotionToggle />
            </header>
            <main className="flex flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
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
