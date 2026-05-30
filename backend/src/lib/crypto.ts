/**
 * AES-256-GCM encryption for platform access tokens stored in the database.
 *
 * Set ENCRYPTION_KEY to a 64-character hex string (32 bytes) generated with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * When ENCRYPTION_KEY is not set the functions are no-ops so the server
 * continues to work in development — credentials are stored as plaintext.
 *
 * Existing plaintext rows are detected by the absence of the ":" delimiter
 * and returned as-is, so a zero-downtime migration is possible: just set the
 * key and re-save each credential through the UI to re-encrypt it.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const DELIMITER = ":";

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext token. Returns encrypted string or plaintext if no key. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv        = randomBytes(12);
  const cipher    = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag       = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(DELIMITER);
}

/**
 * Decrypt a stored token. Returns the plaintext.
 * Gracefully passes through plaintext rows (no delimiter) for migration.
 */
export function decryptToken(stored: string): string {
  const key = getKey();
  // No key — assume plaintext (dev mode)
  if (!key) return stored;
  // Not in encrypted format — legacy plaintext row, return as-is
  if (!stored || stored.split(DELIMITER).length !== 3) return stored;

  try {
    const [ivHex, tagHex, dataHex] = stored.split(DELIMITER);
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return (
      decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") +
      decipher.final("utf8")
    );
  } catch {
    // Decryption failed — likely a plaintext row from before encryption was enabled
    return stored;
  }
}
