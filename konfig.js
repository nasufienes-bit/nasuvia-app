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
  // Bereiche öffnen immer bei der Übersicht. Nur bei Neuladen oder «Zurück» kommt der zuletzt gewählte Reiter wieder.
  window.ordasioReiterBehalten = (() => { try { const n = performance.getEntriesByType('navigation')[0]; return !!n && (n.type === 'reload' || n.type === 'back_forward'); } catch { return false; } })();

  // App-Modus: Ordasio wurde vom Home-Bildschirm geöffnet (als App installiert). Dann wirkt alles wie eine App:
  // keine unterstrichenen Links, kein Lang-Drücken-Menü auf Knöpfen, kein Gummiband-Scrollen, keine Website-Teile.
  // Zum Testen im Browser: ?app=1 (bleibt für den Tab), ?app=0 schaltet aus.
  try {
    const q = new URLSearchParams(location.search).get('app');
    if (q !== null) sessionStorage.setItem('ordasio.app', q);
    const app = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true || sessionStorage.getItem('ordasio.app') === '1';
    window.ORDASIO_APP = !!app;
    if (app) {
      document.documentElement.classList.add('app-modus');
      const st = document.createElement('style');
      st.id = 'app-modus-stil';
      st.textContent = 'html.app-modus,html.app-modus body{overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}'
        + 'html.app-modus a{text-decoration:none!important}'
        + 'html.app-modus a,html.app-modus button,html.app-modus img,html.app-modus svg,html.app-modus label,html.app-modus nav,html.app-modus [role=tab],html.app-modus summary{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}'
        + 'html.app-modus .web-teil{display:none!important}';
      document.head.appendChild(st);
      // Wer die App schliesst und wieder öffnet, landet immer auf der Hauptübersicht (nicht im zuletzt offenen Bereich).
      // 1) Kaltstart: neue App-Sitzung → zur Startseite. 2) Lange im Hintergrund (30 Min.) und nichts angefangen → zur Startseite.
      if (produkt) {
        const wurzel = ((document.currentScript && document.currentScript.src) || '').replace(/konfig\.js(\?.*)?$/, '') || '/';
        const ausnahme = () => /\/(zeit\/erfassen|r|p|b|buchen|treuhand|team|start)\//.test(location.pathname)
          || /token_hash|access_token|refresh_token|[?&#](code|type|neu|paket|produkt|app)=/.test(location.search + location.hash);
        const zurStart = () => { try { sessionStorage.setItem('ordasio.appSitzung', '1'); } catch { /* leer */ } location.replace(wurzel + 'start/'); };
        let neu = false; try { neu = !sessionStorage.getItem('ordasio.appSitzung'); sessionStorage.setItem('ordasio.appSitzung', '1'); } catch { /* leer */ }
        if (neu && !ausnahme()) zurStart();
        let weg = 0, angefangen = false;
        document.addEventListener('input', () => { angefangen = true; }, true);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') { weg = Date.now(); return; }
          if (weg && Date.now() - weg > 30 * 60 * 1000 && !angefangen && !document.querySelector('dialog[open]') && !ausnahme()) zurStart();
        });
      }
      // Leere Fenster (Drucken, Vorschau, Belege): In der App gäbe es dafür keinen Schliessen-Knopf und man käme nicht
      // mehr zurück. Darum öffnen sie hier als Vorschau in der Seite, mit «Drucken» und «Schliessen».
      const echtOeffnen = window.open.bind(window);
      window.open = function (url, ziel, opt) {
        if (url && url !== 'about:blank') return echtOeffnen(url, ziel, opt);
        const h = document.createElement('div');
        h.className = 'ov-vorschau';
        h.innerHTML = '<style>.ov-vorschau{position:fixed;inset:0;z-index:2147483600;background:#F4FAF6;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top);font-family:inherit}'
          + '.ov-kopf{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #E1E9E5;background:#fff}.ov-kopf b{flex:1;font-size:17px;color:#0A1F17;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
          + '.ov-kopf button{border:0;border-radius:100px;padding:10px 16px;font:inherit;font-weight:700;font-size:15px;cursor:pointer}.ov-druck{background:#0E7A55;color:#fff}.ov-zu{background:#E8F4EE;color:#0B3B2E}'
          + '.ov-vorschau iframe{flex:1;width:100%;border:0;background:#fff}</style>'
          + '<div class="ov-kopf"><b>Vorschau</b><button type="button" class="ov-druck">Drucken / PDF</button><button type="button" class="ov-zu" aria-label="Schliessen">Schliessen</button></div><iframe title="Vorschau"></iframe>';
        document.body.appendChild(h);
        const fr = h.querySelector('iframe'), w = fr.contentWindow;
        const zu = () => { h.remove(); };
        h.querySelector('.ov-zu').onclick = zu;
        h.querySelector('.ov-druck').onclick = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch { window.print(); } };
        try { w.close = zu; } catch { /* leer */ }
        fr.addEventListener('load', () => { try { const t = fr.contentDocument && fr.contentDocument.title; if (t) h.querySelector('.ov-kopf b').textContent = t; } catch { /* leer */ } });
        setTimeout(() => { try { const t = fr.contentDocument && fr.contentDocument.title; if (t) h.querySelector('.ov-kopf b').textContent = t; } catch { /* leer */ } }, 400);
        return w;
      };
      // Links, die sonst einen neuen Browser-Tab öffnen würden: innerhalb von Ordasio im selben Fenster bleiben
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[target=_blank]');
        if (!a || !a.href) return;
        try { const u = new URL(a.href, location.href); if (u.origin === location.origin && !a.hasAttribute('download')) { e.preventDefault(); location.href = u.href; } } catch { /* leer */ }
      }, true);
    }
  } catch { /* ohne App-Modus weiter */ }
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
