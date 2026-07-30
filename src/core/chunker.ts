export const CHUNK_SIZE = 64 * 1024; // 64 KiB WebRTC chunk size

export function getChunkCount(fileSize: number): number {
  return Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
}

export async function readChunk(file: File | Blob, chunkIndex: number): Promise<ArrayBuffer> {
  const start = chunkIndex * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const slice = file.slice(start, end);
  return await slice.arrayBuffer();
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
      };
    } catch (err) {
      console.info('Direct disk writing cancelled or skipped by user:', err);
    }
  }
  return null;
}
