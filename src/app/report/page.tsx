import { Report } from "@/components/lesson/Report";
import { mailConfig } from "@/lib/mail";

export const metadata = { title: "Your report card · Magic combat" };

// Results by step, mistakes by myth, strengths and needs, and what's next.
// The one-tap check-in only shows when feedback email is set up.
export default function ReportPage() {
  return <Report feedbackOn={mailConfig() !== null} />;
}
