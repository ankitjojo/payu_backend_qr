import { createDecipheriv } from 'crypto';
import { config } from '../config';

// AES-256-CBC — matches jojo_subscription_backend_2_0 encDec.utils.ts
const ALGO = 'aes-256-cbc' as const;

function getKeyAndIv(): { key: Buffer; iv: Buffer } | null {
  const { secretKey, iv: ivHex } = config.jojo;
  if (!secretKey || !ivHex) return null;

  const key = Buffer.from(secretKey, 'base64');
  const iv  = Buffer.from(ivHex, 'hex');

  if (key.length !== 32 || iv.length !== 16) return null;
  return { key, iv };
}

/** Returns true when both env vars are present and valid-length. */
export function isJojoDecryptionConfigured(): boolean {
  return getKeyAndIv() !== null;
}

/**
 * Decrypts the hex-encoded AES-256-CBC ciphertext in a Jojo `{"data":"<hex>"}` response.
 * Returns the parsed JSON object on success, or null if keys are missing / decryption fails.
 */
export function decryptJojoResponse(encryptedHex: string): { ok: true; json: unknown } | { ok: false; reason: string } {
  const creds = getKeyAndIv();
  if (!creds) {
    return { ok: false, reason: 'JOJO_SECRET_KEY or JOJO_IV not set in .env' };
  }

  try {
    const encBuf   = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(ALGO, creds.key, creds.iv);
    const decBuf   = Buffer.concat([decipher.update(encBuf), decipher.final()]);
    const plainText = decBuf.toString('utf8');
    return { ok: true, json: JSON.parse(plainText) };
  } catch (err: any) {
    return { ok: false, reason: err.message ?? 'Decryption or JSON parse failed' };
  }
}
