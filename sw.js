// Offline: prima la rete (così un aggiornamento arriva subito e i file restano coerenti tra loro),
// poi la cache se la rete manca o è troppo lenta.
const CACHE = 'healthfit-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/app.css',
  './js/main.js', './js/store.js', './js/calc.js', './js/data.js', './js/charts.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];
const TIMEOUT_MS = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    net.catch(() => {}); // se vince la cache, un errore di rete successivo non va segnalato
    const cached = () => cache.match(e.request, { ignoreSearch: true })
      .then((hit) => hit || (e.request.mode === 'navigate' ? cache.match('./index.html') : undefined));
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('lenta')), TIMEOUT_MS))]);
    } catch {
      const hit = await cached();
      if (hit) return hit;
      return net; // niente in cache: aspetta comunque la rete
    }
  })());
});
