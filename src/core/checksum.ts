/**
 * Calculates SHA-256 checksum of a Blob/File using Web Crypto API.
 */
export async function calculateSHA256(fileOrBlob: Blob): Promise<string> {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validates a received blob against expected SHA-256 hash.
 */
export async function verifyChecksum(blob: Blob, expectedHash?: string): Promise<boolean> {
  if (!expectedHash) return true; // If no checksum provided, pass
  try {
    const actualHash = await calculateSHA256(blob);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (err) {
    console.error('Checksum calculation error:', err);
    return false;
  }
}
