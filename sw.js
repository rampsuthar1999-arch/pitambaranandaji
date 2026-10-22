/* Offline support: the app shell and texts are refreshed from the network when online,
   page images are kept once viewed. */
const CACHE = 'pitambarananda-v1';
const SHELL = ['./', 'index.html', 'assets/style.css', 'assets/app.js', 'assets/icon.svg',
  'data/library.json', 'data/texts.json', 'data/qa.json', 'data/thoughts.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.url.endsWith('.webp')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
