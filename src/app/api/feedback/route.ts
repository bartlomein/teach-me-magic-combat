import { Resend } from "resend";
import { feedbackEmail, parseFeedback } from "@/lib/lesson/feedback";
import { mailConfig } from "@/lib/mail";

/**
 * POST /api/feedback: emails the author an anonymous summary from the report card,
 * through Resend (see src/lib/mail.ts and .env.example).
 * With no email settings it does nothing (404), and the report card hides the question.
 */
export async function POST(request: Request) {
  const mail = mailConfig();
  if (!mail) return new Response(null, { status: 404 });

  // Small, fixed-shape payload: refuse anything big before parsing it.
  const raw = await request.text();
  if (raw.length > 4000) return Response.json({ error: "too large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const feedback = parseFeedback(body);
  if (!feedback) return Response.json({ error: "bad feedback" }, { status: 400 });

  const { subject, text } = feedbackEmail(feedback);
  const { error } = await new Resend(mail.key).emails.send({ from: mail.from, to: mail.to, subject, text });
  if (error) {
    console.error("Feedback email failed:", error.message);
    return Response.json({ sent: false }, { status: 502 });
  }
  return Response.json({ sent: true });
}
