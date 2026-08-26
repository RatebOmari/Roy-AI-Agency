/**
 * Low-level Resend email sender.
 *
 * Wraps the single `POST https://api.resend.com/emails` call shared by team
 * invites, outreach broadcasts, and approval reminders. Callers build the
 * fully-formed `from` address and decide what to do with the outcome (log,
 * return a result, etc.); they are responsible for checking that an API key
 * exists when they want to treat "no key" as a distinct skip.
 */
export interface ResendPayload {
  from:     string;
  to:       string | string[];
  subject:  string;
  text:     string;
  html?:    string;
}

export type ResendResult =
  | { ok: true; id?: string }
  | { ok: false; status: number; error: string };

export async function resendSend(apiKey: string, payload: ResendPayload): Promise<ResendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    return { ok: false, status: res.status, error: err.message ?? `Resend API ${res.status}` };
  }

  const data = await res.json().catch(() => ({})) as { id?: string };
  return { ok: true, id: data.id };
}
