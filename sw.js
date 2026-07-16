const CACHE_NAME = 'relocation-v1.77.5-7a09e49';
const FILES = [
  './', './index.html', './style.css', './app.js', './data.js', './sync.js',
  './manifest.json', './icon.svg',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(FILES.map(f => c.add(f).catch(() => {}))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/sw.js')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
