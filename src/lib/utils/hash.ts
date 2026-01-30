import crypto from "node:crypto";

/**
 * Calculates SHA-256 hash of the provided text.
 * Used for deduplication of generation requests with identical source text.
 *
 * @param text - The text to hash
 * @returns Hexadecimal string representation of the SHA-256 hash
 *
 * @example
 * const hash = calculateSHA256("Hello, world!");
 * // Returns: "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
 */
export function calculateSHA256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
