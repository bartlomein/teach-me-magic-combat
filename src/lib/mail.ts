/**
 * Server only (reads secrets); never import from a client component.
 *
 * Email settings for the feedback note, sent with Resend (same setup as the
 * Telemetry Studio site). Set in .env.local, or the host's environment:
 *   RESEND_API_KEY  your Resend API key
 *   FEEDBACK_TO     where the notes go
 *   FEEDBACK_FROM   a sender on a domain verified in Resend (optional; Resend's
 *                   test sender only delivers to the Resend account's own address)
 * Returns null when the key or recipient is missing: then the check-in isn't shown at all.
 */
export function mailConfig() {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO;
  if (!key || !to) return null;
  return { key, to, from: process.env.FEEDBACK_FROM || "Teach Me <onboarding@resend.dev>" };
}
