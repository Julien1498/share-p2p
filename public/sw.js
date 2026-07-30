const CACHE_NAME = 'dropp2p-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg'
];

const downloadStreams = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, streamId, fileName, fileSize, mimeType, chunk } = event.data;

  if (type === 'REGISTER_NATIVE_STREAM') {
    const { readable, writable } = new TransformStream();
    downloadStreams.set(streamId, {
      readable,
      writable,
      writer: writable.getWriter(),
      fileName,
      fileSize,
      mimeType,
    });
  } else if (type === 'WRITE_NATIVE_CHUNK') {
    const stream = downloadStreams.get(streamId);
    if (stream && stream.writer) {
      stream.writer.write(new Uint8Array(chunk)).catch(() => {});
    }
  } else if (type === 'CLOSE_NATIVE_STREAM') {
    const stream = downloadStreams.get(streamId);
    if (stream && stream.writer) {
      stream.writer.close().catch(() => {});
      downloadStreams.delete(streamId);
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept P2P Native Download Stream requests to trigger Chrome Native Download Bar
  if (url.pathname.includes('/p2p-download-stream/')) {
    const streamId = url.searchParams.get('streamId');
    const streamInfo = downloadStreams.get(streamId);

    if (streamInfo) {
      const headers = new Headers({
        'Content-Type': streamInfo.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(streamInfo.fileName)}"`,
      });

      if (streamInfo.fileSize) {
        headers.set('Content-Length', streamInfo.fileSize.toString());
      }

      event.respondWith(new Response(streamInfo.readable, { headers }));
      return;
    }
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.startsWith('http')) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      );
    })
  );
});
