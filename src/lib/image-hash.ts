/**
 * Computes a SHA-256 hex digest of a data-URL string.
 * Used to detect duplicate reference images regardless of filename.
 */
export async function hashDataUrl(dataUrl: string): Promise<string> {
  const data = new TextEncoder().encode(dataUrl);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
