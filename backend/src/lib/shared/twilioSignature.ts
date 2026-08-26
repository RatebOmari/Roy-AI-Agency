import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Twilio request signature.
 *
 * Twilio signs `url + <alpha-sorted key+value pairs>` with HMAC-SHA1 keyed by
 * the account auth token, base64-encoded, sent in the `X-Twilio-Signature`
 * header. Comparison is constant-time; any mismatch (including a length
 * difference, which makes timingSafeEqual throw) returns false.
 */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map(k => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(str).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
