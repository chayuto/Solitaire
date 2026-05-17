/**
 * UUIDv7 generator.
 *
 * UUIDv7 (RFC 9562) embeds a 48-bit Unix-millisecond timestamp, so ids sort
 * chronologically. Each AI request is tagged with one as a stable, idempotent
 * identifier that retries of the same request reuse.
 *
 * @module ai/uuid
 */

/** Generate a UUIDv7 string. */
export function uuidv7(): string {
  const timestamp = Date.now();
  const bytes = new Uint8Array(16);

  // Bytes 0-5: 48-bit big-endian millisecond timestamp.
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  // Bytes 6-15: random.
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  bytes.set(random, 6);

  // Version 7 in the high nibble of byte 6.
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Variant (10xx) in the high bits of byte 8.
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20)}`
  );
}
