/*
 * Service worker do FalaBrincando.
 *
 * Estratégia:
 * - navegação (HTML): rede primeiro, com o app shell em cache como reserva;
 * - estáticos (/assets, ícones): cache primeiro;
 * - qualquer /api: NUNCA cacheado (dados de pacientes).
 */
const CACHE = 'falabrincando-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Dados de pacientes nunca vão para o cache do dispositivo.
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (/\/assets\/|\/icons\/|\.(svg|png|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) => hit || fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return resp;
        })
      )
    );
  }
});