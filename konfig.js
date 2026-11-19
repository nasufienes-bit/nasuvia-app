// Welche Datenbank die Programme benutzen.
// Eigene Nutzung (Nasuvia): eigenes Projekt. Verkaufte Version (app.nasuvia.ch): getrennte Kunden-Datenbank in Zürich.
// Zum Testen auf dem eigenen Computer: ?produkt=1 an die Adresse hängen (nur auf localhost).
(() => {
  const EIGEN = { url: 'https://dyepnomhidubsfwyorke.supabase.co', key: 'sb_publishable_zEmC1R5vq234zR6ST7PTmA_uY7Z1-ph', speicher: 'nb.anmeldung', produkt: false };
  const KUNDEN = { url: 'https://poyilrmwcsyqdajsykpt.supabase.co', key: 'sb_publishable_312jPWJKkZNlWWc51a6Ucw_Ku-xF8Vw', speicher: 'nk.anmeldung', produkt: true };
  let produkt = /^app\./i.test(location.hostname);
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try {
      const q = new URLSearchParams(location.search).get('produkt');
      if (q !== null) sessionStorage.setItem('nk.produkt', q);
      produkt = sessionStorage.getItem('nk.produkt') === '1';
    } catch { /* ohne Speicher: eigene Nutzung */ }
  }
  window.NASUVIA_KONFIG = produkt ? KUNDEN : EIGEN;
})();
