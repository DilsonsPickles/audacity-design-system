// Browser-side helpers for ferrying binary payloads through JSON. Used by
// the cloud-save flow to embed audio WAV buffers in adieu's `data` JSON
// blob (which is stored as TEXT, so we can't ship raw bytes).

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  // Chunk to keep the apply() call short of the per-call argument limit
  // on engines that enforce one.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Encode each WAV ArrayBuffer in a buffer map to base64. */
export function encodeBufferMap(map: Record<string, ArrayBuffer>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k] = arrayBufferToBase64(v);
  return out;
}

/** Decode a base64-encoded buffer map back to ArrayBuffers. Tolerates a map
 *  that's already in ArrayBuffer form (returns it as-is) so the same loader
 *  can handle both cloud-restored and IndexedDB-restored projects. */
export function decodeBufferMap(
  map: Record<string, string | ArrayBuffer> | undefined,
): Record<string, ArrayBuffer> {
  if (!map) return {};
  const out: Record<string, ArrayBuffer> = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === 'string') out[k] = base64ToArrayBuffer(v);
    else out[k] = v;
  }
  return out;
}
