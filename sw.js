// Hält die App offline verfügbar. Bei jeder neuen Fassung VERSION erhöhen.
const VERSION = 'app-1795479407';
const DATEIEN = ['./', 'index.html', 'app.js', 'navi.js', 'speicher.js', 'abgleich.js', 'konfig.js', 'pakete.js', 'branchen.js', 'leser.js', 'doppelt.js', 'lizenz.js', 'marke.js', 'privat/', 'privat/index.html', 'zeit/', 'zeit/index.html', 'zeit/erfassen/', 'zeit/erfassen/index.html', 'termine/', 'termine/index.html', 'lager/', 'lager/index.html', 'treuhand/', 'treuhand/index.html', 'lizenz/', 'lizenz/index.html', 'hilfe/', 'hilfe/index.html', 'suche.js', 'ui.js', 'start/', 'start/index.html', 'selbstaendig/', 'selbstaendig/index.html', 'korb.js', 'auszug.js', 'privat/mehr.js', 'lib/supabase.js', 'schrift.css', 'logo.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest',
  'lib/html2canvas.min.js', 'lib/jspdf.umd.min.js', 'lib/qrcode.js', 'rechnungen/', 'rechnungen/index.html', 'rechnungen/dienst.js', 'rechnungen/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== VERSION).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
// Zuerst das Netz, damit Änderungen sofort ankommen; ohne Netz aus dem Zwischenspeicher
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // no-cache: beim Server nachfragen (günstig dank ETag), damit nie eine alte Fassung aus dem Browser-Zwischenspeicher kommt
  const frisch = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(fetch(frisch).then((r) => {
    const kopie = r.clone();
    caches.open(VERSION).then((c) => c.put(e.request, kopie));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
