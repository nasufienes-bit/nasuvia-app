// Welche Datenbank die Programme benutzen.
// Eigene Nutzung (Nasuvia): eigenes Projekt. Verkaufte Version (app.ordasio.ch): getrennte Kunden-Datenbank in Zürich.
// Zum Testen auf dem eigenen Computer: ?produkt=1 an die Adresse hängen (nur auf localhost).
(() => {
  const EIGEN = { url: 'https://dyepnomhidubsfwyorke.supabase.co', key: 'sb_publishable_zEmC1R5vq234zR6ST7PTmA_uY7Z1-ph', speicher: 'nb.anmeldung', produkt: false };
  const KUNDEN = { url: 'https://poyilrmwcsyqdajsykpt.supabase.co', key: 'sb_publishable_312jPWJKkZNlWWc51a6Ucw_Ku-xF8Vw', speicher: 'nk.anmeldung', produkt: true,
    // Demo-Konto: nur mit Anmeldung (keine automatische Anmeldung mehr, damit niemand sieht, was andere hochladen).
    // Die E-Mail dient nur dazu, im Demo-Konto einen Hinweis zu zeigen.
    demo: { email: 'demo@ordasio.ch' },
    // Cloudflare Turnstile (öffentlicher Site-Key). Leer = keine Sicherheitsprüfung. Den geheimen Schlüssel trägt nur der Inhaber in Supabase ein.
    turnstile: '' };
  let produkt = /^app\./i.test(location.hostname);
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try {
      const q = new URLSearchParams(location.search).get('produkt');
      if (q !== null) sessionStorage.setItem('nk.produkt', q);
      produkt = sessionStorage.getItem('nk.produkt') === '1';
    } catch { /* ohne Speicher: eigene Nutzung */ }
  }
  window.NASUVIA_KONFIG = produkt ? KUNDEN : EIGEN;
  // Token der Sicherheitsprüfung holen (lädt captcha.js erst bei Bedarf). Gibt undefined, wenn keine Prüfung eingerichtet ist.
  const basis = (document.currentScript && document.currentScript.src) || '';
  window.ordasioCaptcha = () => {
    if (!window.NASUVIA_KONFIG.turnstile) return Promise.resolve(undefined);
    if (window.OrdasioCaptcha) return window.OrdasioCaptcha.token().catch(() => undefined);
    return new Promise((ok) => {
      const s = document.createElement('script');
      s.src = basis ? basis.replace(/konfig\.js(\?.*)?$/, 'captcha.js') : '/captcha.js';
      s.onload = () => (window.OrdasioCaptcha ? window.OrdasioCaptcha.token().catch(() => undefined) : Promise.resolve(undefined)).then(ok);
      s.onerror = () => ok(undefined);
      document.head.appendChild(s);
    });
  };
})();
