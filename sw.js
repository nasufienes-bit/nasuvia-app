// Hält die App offline verfügbar. Bei jeder neuen Fassung VERSION erhöhen.
const VERSION = 'app-1795803354';
const DATEIEN = ['./', 'index.html', 'app.js', 'navi.js', 'seitenleiste.js', 'firmen.js', 'neu.js', 'fremdimport.js', 'speicher.js', 'abgleich.js', 'konfig.js', 'pakete.js', 'branchen.js', 'gav.js', 'berufe.js', 'leser.js', 'mail.js', 'doppelt.js', 'lizenz.js', 'postfach.js', 'captcha.js', 'zusatz.js', 'konten.js', 'briefing.js', 'ikonen.js', 'stabil.js', 'ordi-aktionen.js', 'konto/', 'konto/index.html', 'projekte/', 'projekte/index.html', 'projekte/projekte.js', 'p/', 'p/index.html', 'wechsel/', 'wechsel/index.html', 'marke.js', 'privat/', 'privat/index.html', 'zeit/', 'zeit/index.html', 'zeit/erfassen/', 'zeit/erfassen/index.html', 'termine/', 'termine/index.html', 'lager/', 'lager/index.html', 'ablage/', 'ablage/index.html', 'ablage/ablage.js', 'vorlagen/', 'vorlagen/index.html', 'vorlagen/vorlagen.js', 'treuhand/', 'treuhand/index.html', 'lizenz/', 'lizenz/index.html', 'hilfe/', 'hilfe/index.html', 'suche.js', 'ordi.js', 'erinnerungen.js', 'tipps.js', 'ui.js', 'start/', 'start/index.html', 'selbstaendig/', 'selbstaendig/index.html', 'dienste/', 'dienste/index.html', 'korb.js', 'auszug.js', 'privat/mehr.js', 'lib/supabase.js', 'schrift.css', 'logo.png', 'logo-weiss.png', 'favicon.png', 'ordasio-zeichen.svg', 'ordasio-zeichen-weiss.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest',
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
