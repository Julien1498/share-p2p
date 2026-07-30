export const CHUNK_SIZE = 256 * 1024; // 256 KiB high-throughput WebRTC chunk size
export const MAX_RAM_CACHE_BYTES = 2048 * 1024 * 1024; // 2 GB shared RAM cache threshold
export const MAX_CACHE_CHUNKS = Math.floor(MAX_RAM_CACHE_BYTES / CHUNK_SIZE); // 8192 chunks

export function getChunkCount(fileSize: number): number {
  return Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
}

export function stringToHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

const globalChunkCache = new Map<string, Map<number, ArrayBuffer>>();

export async function readChunk(file: File | Blob, chunkIndex: number): Promise<ArrayBuffer> {
  const start = chunkIndex * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const slice = file.slice(start, end);
  return await slice.arrayBuffer();
}

/**
 * Shared in-memory chunk cache manager with a 2 GB sliding ring buffer.
 */
export async function readChunkCached(file: File | Blob, chunkIndex: number): Promise<ArrayBuffer> {
  const fileKey = `${(file as File).name || 'file'}_${file.size}_${(file as File).lastModified || 0}`;
  let fileCache = globalChunkCache.get(fileKey);
  if (!fileCache) {
    fileCache = new Map<number, ArrayBuffer>();
    globalChunkCache.set(fileKey, fileCache);
  }

  if (fileCache.has(chunkIndex)) {
    return fileCache.get(chunkIndex)!;
  }

  const chunk = await readChunk(file, chunkIndex);
  
  // Maintain a 2 GB sliding ring buffer (8192 chunks of 256 KiB)
  if (fileCache.size >= MAX_CACHE_CHUNKS) {
    const oldestChunkIndex = fileCache.keys().next().value;
    if (oldestChunkIndex !== undefined) {
      fileCache.delete(oldestChunkIndex);
    }
  }
  fileCache.set(chunkIndex, chunk);
  return chunk;
}

export function getFileCacheStats(fileName: string, fileSize: number, lastModified?: number): { cachedChunks: number; totalChunks: number; percent: number; cachedBytes: number; isCapReached: boolean } {
  const fileKey = `${fileName}_${fileSize}_${lastModified || 0}`;
  const fileCache = globalChunkCache.get(fileKey);
  const totalChunks = getChunkCount(fileSize);
  const cachedChunks = fileCache ? fileCache.size : 0;
  const cachedBytes = Math.min(fileSize, cachedChunks * CHUNK_SIZE);
  const percent = totalChunks > 0 ? Math.min(100, Math.round((cachedBytes / fileSize) * 100)) : 0;
  const isCapReached = cachedChunks >= MAX_CACHE_CHUNKS;
  return { cachedChunks, totalChunks, percent, cachedBytes, isCapReached };
}

export function clearFileChunkCache(file: File | Blob): void {
  const fileKey = `${(file as File).name || 'file'}_${file.size}_${(file as File).lastModified || 0}`;
  globalChunkCache.delete(fileKey);
}

export function reassembleChunks(chunks: ArrayBuffer[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType || 'application/octet-stream' });
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface DirectDiskWriter {
  writeChunk: (chunk: ArrayBuffer) => Promise<void>;
  close: () => Promise<void>;
  abort?: () => Promise<void>;
}

/**
 * Triggers Chrome's NATIVE Download Manager Bar (top-right/bottom download bar with .crdownload file)
 * via Service Worker Stream Bridge.
 */
export async function createNativeChromeDownloadWriter(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<DirectDiskWriter | null> {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (isFirefox) return null; // Skip Chromium-only ServiceWorker iframe stream bridge on Firefox

    try {
      const streamId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_NATIVE_STREAM',
        streamId,
        fileName,
        fileSize,
        mimeType: mimeType || 'application/octet-stream',
      });

      // Create hidden iframe to trigger Chrome Native Download Bar
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `./p2p-download-stream/?streamId=${streamId}`;
      document.body.appendChild(iframe);

      return {
        writeChunk: async (chunk: ArrayBuffer) => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'WRITE_NATIVE_CHUNK',
              streamId,
              chunk,
            });
          }
        },
        close: async () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CLOSE_NATIVE_STREAM',
              streamId,
            });
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 5000);
        },
        abort: async () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'ABORT_NATIVE_STREAM',
              streamId,
            });
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        },
      };
    } catch (err) {
      console.warn('Native Chrome Download stream bridge failed:', err);
    }
  }
  return null;
}

/**
 * Creates a direct-to-disk stream writer using FileSystem Access API (showSaveFilePicker).
 */
export async function createDirectDiskWriter(fileName: string): Promise<DirectDiskWriter | null> {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
      });
      const writable = await handle.createWritable();
      return {
        writeChunk: async (chunk: ArrayBuffer) => {
          await writable.write(chunk);
        },
        close: async () => {
          await writable.close();
        },
        abort: async () => {
          await writable.abort();
        },
      };
    } catch (err) {
      console.info('Direct disk writing cancelled or skipped by user:', err);
    }
  }
  return null;
}
