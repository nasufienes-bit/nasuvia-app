// Ordi: der kleine Helfer unten rechts. Beantwortet Fragen aus der Anleitung (paketgerecht),
// mit KI, falls eingerichtet, und erzählt ab und zu einen Funfact.
(() => {
  if (window.Ordi) return;
  const K = window.NASUVIA_KONFIG || {};
  const AUS = 'ordi.aus';
  const lies = (k, s) => { try { const v = localStorage.getItem(k); return v == null ? s : JSON.parse(v); } catch { return s; } };
  const setz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const skript = document.currentScript;
  const hier = (document.querySelector('script[data-hier]') || { dataset: {} }).dataset.hier || (location.pathname.split('/').filter(Boolean).slice(-1)[0] || 'buchhaltung');

  const FUNFACTS = [
    'Ordasio kommt von «Ordnung». Ordnung im Büro schafft Zeit fürs Geschäft. Und ich heisse Ordi, weil ich aufgeräumte Ordner mag. 📁',
    'Geschäftsbücher und Belege müssen in der Schweiz 10 Jahre aufbewahrt werden (Art. 958f OR). Gut, dass Ordasio nichts wegwirft.',
    '80 bis 90 % der Konkurse in der Schweiz entstehen durch Geldengpässe, nicht durch Überschuldung. Rechnungen sofort schreiben und offene Posten im Blick behalten hilft enorm.',
    'Rund die Hälfte der neuen Firmen in der Schweiz gibt es fünf Jahre nach der Gründung noch. Eine saubere Buchhaltung gehört zu den besten Startvorteilen.',
    'MWST-pflichtig wird man ab CHF 100’000 Umsatz im Jahr. Ordasio zeigt Ihnen, wie nahe Sie dran sind.',
    'Seit Oktober 2022 gibt es nur noch QR-Rechnungen. Die alten roten und orangen Einzahlungsscheine sind Geschichte.',
    'Arbeitszeiten müssen in der Schweiz grundsätzlich erfasst und 5 Jahre aufbewahrt werden. Mit dem Handy-Link geht das in Sekunden.',
    'Eine freundliche Zahlungserinnerung ist völlig normal. Wer nach Fristablauf nachfragt, wird meist schneller bezahlt.',
    'Ich lese Belege auch aus Fotos: Betrag, Datum und MWST. Sie müssen nur noch bestätigen.',
  ];
  const BEREICH = { buchhaltung: 'Buchhaltung', rechnungen: 'Rechnungen', zeit: 'Zeiterfassung', termine: 'Termine', lager: 'Lager', privat: 'Home-Büro', ablage: 'Firmenablage', vorlagen: 'Vorlagen', start: 'Erste Schritte', treuhand: 'Treuhand', hilfe: '' };
  const VORSCHLAEGE = {
    buchhaltung: ['Wie erfasse ich einen Beleg?', 'Wie lade ich den Kontoauszug?', 'Wie mache ich die MWST-Abrechnung?'],
    rechnungen: ['Wie schreibe ich eine Rechnung?', 'Wie mahne ich?', 'Logo auf der Rechnung ändern'],
    zeit: ['Wie bekommen Mitarbeitende ihren Link?', 'Stempeluhr oder Stunden eintragen?', 'Stundenrapport drucken'],
    privat: ['Wie lade ich den Kontoauszug?', 'Steuererklärung Schritt für Schritt', 'Sparziel anlegen'],
    ablage: ['Ordner anlegen', 'Dokument für Mitarbeiter freigeben', 'Ferienanträge'],
    termine: ['Wie buchen Kunden online?', 'Öffnungszeiten ändern'],
    lager: ['Artikel erfassen', 'Was muss ich nachbestellen?'],
  };
  const AUFGABEN = ['Buche 45.20 Migros als Material', 'Umsatz diesen Monat?', 'Offene Rechnungen?', 'Erinnere mich morgen um 9 an die Offerte', 'Füge Mitarbeiter Luca Meier hinzu und erstelle den Auftrag Badsanierung Müller und teile ihn Luca zu'];
  const vorschlaege = () => [...(VORSCHLAEGE[hier] || ['Was kann Ordasio?', 'Wie schreibe ich eine Rechnung?']).slice(0, 2), ...(hier === 'zeit' ? [AUFGABEN[4]] : AUFGABEN.slice(0, 2))];
  // Aufgaben-Teil nachladen (Rechnung, Erinnerung, Zahlen …)
  try { if (!window.OrdiAktionen) { const sc = document.createElement('script'); sc.src = new URL('ordi-aktionen.js', skript.src).href; document.head.appendChild(sc); } } catch {}

  // Ordi selbst: ein freundlicher Ordner mit Gesicht (eigene Zeichnung)
  const GESICHT = (gross = 30) => `<svg viewBox="0 0 64 64" width="${gross}" height="${gross}" aria-hidden="true"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34D399"/><stop offset="1" stop-color="#0E7A55"/></linearGradient></defs>
    <path d="M8 18a6 6 0 0 1 6-6h12l5 5h19a6 6 0 0 1 6 6v25a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="url(#og)"/><path d="M8 24h48" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="25" cy="35" r="3.4" fill="#0A1F17"/><circle cx="39" cy="35" r="3.4" fill="#0A1F17"/><circle cx="26.2" cy="33.8" r="1.1" fill="#fff"/><circle cx="40.2" cy="33.8" r="1.1" fill="#fff"/>
    <path d="M26 43c3.5 3 8.5 3 12 0" stroke="#0A1F17" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="41" r="2.4" fill="#F9A8D4" opacity=".7"/><circle cx="44" cy="41" r="2.4" fill="#F9A8D4" opacity=".7"/></svg>`;

  const css = document.createElement('style');
  css.textContent = `
  .ordi-knopf{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:70;width:58px;height:58px;border-radius:20px;border:0;background:#fff;box-shadow:0 14px 34px -14px color-mix(in srgb,var(--blau,#0B3B2E) 55%,transparent),0 1px 2px rgba(0,0,0,.06);display:grid;place-items:center;cursor:pointer;transition:transform .2s}
  .ordi-knopf:hover{transform:translateY(-2px) rotate(-3deg)}
  button.ordi-kopfknopf.ordi-kopfknopf{position:relative;flex:none;display:inline-flex!important;align-items:center;justify-content:center;width:40px!important;height:40px!important;padding:0!important;margin:0 2px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 16%,transparent)!important;border-radius:50%!important;background:#fff!important;box-shadow:none;cursor:pointer;transition:transform .2s}
  button.ordi-kopfknopf svg{display:block;width:26px;height:26px}
  button.ordi-kopfknopf:hover{transform:rotate(-6deg)}
  .ordi-kopfknopf .ordi-blase{position:absolute;top:calc(100% + 10px);right:-4px;bottom:auto;z-index:90;border-radius:14px 4px 14px 14px}
  .ordi-kopfplatz{display:inline-flex;align-items:center;gap:10px;margin-left:auto;flex:none}
  header:has(> .ordi-kopfplatz){flex-wrap:nowrap!important}
  .ordi-kopfplatz > a{white-space:nowrap}
  @media(max-width:480px){.ordi-kopfplatz > a[href^="mailto"]{font-size:0!important;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 16%,transparent)}.ordi-kopfplatz > a[href^="mailto"]::before{content:"✉";font-size:17px;line-height:1}}
  .ordi-panel.oben{top:76px;bottom:auto}
  .ordi-blase{position:absolute;right:66px;bottom:8px;background:#0A1F17;color:#fff;font:600 13px/1.3 'League Spartan',system-ui,sans-serif;border-radius:14px 14px 4px 14px;padding:8px 12px;white-space:nowrap;box-shadow:0 10px 24px -12px rgba(0,0,0,.5);animation:ordiRein .4s ease}
  body:has(.nr-status) .ordi-knopf{bottom:calc(66px + env(safe-area-inset-bottom))}
  @keyframes ordiRein{from{opacity:0;transform:translateY(6px)}}
  @media(max-width:820px){.ordi-knopf{bottom:calc(84px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:18px}body:has(.fab) .ordi-knopf{bottom:calc(146px + env(safe-area-inset-bottom))}}
  .ordi-panel{position:fixed;right:16px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:9500;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 140px));background:#fff;border-radius:22px;box-shadow:0 40px 90px -30px rgba(12,18,38,.55),0 0 0 1px color-mix(in srgb,var(--blau,#0B3B2E) 8%,transparent);display:flex;flex-direction:column;overflow:hidden;font:15px/1.45 'League Spartan',system-ui,sans-serif;color:#0A1F17;animation:ordiRein .25s ease}
  @media(max-width:820px){.ordi-panel{left:8px;right:8px;width:auto;bottom:calc(8px + env(safe-area-inset-bottom));height:min(78vh,620px)}}
  .ordi-kopf{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:linear-gradient(135deg,#0A1F17,var(--blau,#0B3B2E));color:#fff}
  .ordi-kopf b{font-size:16px;display:block}.ordi-kopf small{opacity:.75;font-size:12px}
  .ordi-kopf button{margin-left:auto;border:0;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;border-radius:10px;font-size:18px;cursor:pointer}
  .ordi-kopf .ordi-menue{margin-left:auto}.ordi-kopf [data-ordi-zu]{margin-left:6px}
  .ordi-verlauf{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#F7FAF8}
  .ordi-msg{max-width:88%;border-radius:16px;padding:10px 12px;white-space:pre-wrap;word-wrap:break-word}
  .ordi-msg.ordi{background:#fff;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);border-bottom-left-radius:4px;align-self:flex-start}
  .ordi-msg.ich{background:var(--blau,#0B3B2E);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  .ordi-msg.fakt{background:linear-gradient(135deg,#FFF8E6,#FDF2D0);border:1px solid #F5D58A}
  .ordi-msg ol{margin:6px 0 0 18px;padding:0}.ordi-msg li{margin:2px 0}
  .ordi-msg a.ordi-hin{display:inline-block;margin-top:8px;font-weight:700;color:var(--elektrik,#0E7A55);text-decoration:none}
  .ordi-chips{display:flex;gap:6px;flex-wrap:wrap}
  .ordi-aktion{background:#fff;border:1.5px solid color-mix(in srgb,var(--elektrik,#0E7A55) 35%,transparent);border-radius:14px;padding:10px 12px;margin-top:4px}.ordi-aktion small{color:#7C8499}
  .ordi-aktion [data-ordi-ja]{background:var(--blau,#0B3B2E)!important;color:#fff!important;border-color:transparent!important}
  .ordi-chips button{border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 18%,transparent);background:#fff;border-radius:100px;padding:6px 11px;font:inherit;font-size:13px;color:var(--blau,#0B3B2E);cursor:pointer}
  .ordi-eingabe{display:flex;gap:8px;padding:10px;border-top:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);background:#fff}
  .ordi-eingabe input{flex:1;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);border-radius:100px;padding:11px 14px;font:inherit;font-size:16px;min-width:0}
  .ordi-eingabe button{border:0;border-radius:100px;background:var(--blau,#0B3B2E);color:#fff;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}
  .ordi-dateibar{display:flex;align-items:center;gap:8px;margin:0 12px 6px;padding:7px 8px 7px 12px;border-radius:12px;background:color-mix(in srgb,var(--elektrik,#0E7A55) 9%,transparent);font-size:12.5px;color:var(--blau,#0B3B2E)}
  .ordi-dateibar[hidden]{display:none}.ordi-dateibar b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ordi-dateibar button{border:0;background:none;cursor:pointer;color:inherit;font:inherit;font-weight:700;padding:2px 6px;border-radius:8px}.ordi-dateibar button:hover{background:rgba(0,0,0,.06)}
  .ordi-eingabe .ordi-datei{flex:none;width:44px;padding:0;display:grid;place-items:center;background:#fff;color:var(--blau,#0B3B2E);border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent)}
  .ordi-msg img.ordi-vorschau{display:block;max-width:180px;max-height:140px;border-radius:10px;margin-top:6px;object-fit:cover}
  .ordi-tippt span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#7C8499;margin-right:3px;animation:ordiPunkt 1s infinite}
  .ordi-tippt span:nth-child(2){animation-delay:.15s}.ordi-tippt span:nth-child(3){animation-delay:.3s}
  @keyframes ordiPunkt{50%{opacity:.25;transform:translateY(-2px)}}
  .ordi-mensch-leiste{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#EAF6F0;font-size:13px;color:#0B3B2E;border-bottom:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent)}
  .ordi-mensch-leiste button{margin-left:auto;border:0;background:#0B3B2E;color:#fff;border-radius:100px;padding:6px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  .ordi-mensch-leiste.neu{background:#FFF4D6}.ordi-msg.team{background:#EAF6F0;border:1px solid #BFE5D2;border-bottom-left-radius:4px;align-self:flex-start}
  .ordi-msg .ordi-wer{display:block;font-size:11.5px;font-weight:700;color:#0E7A55;margin-bottom:3px}.ordi-msg.ich .ordi-wer{color:#B9F3D4}
  .ordi-pruef{display:grid;gap:8px;background:#fff;border:1.5px solid color-mix(in srgb,var(--elektrik,#0E7A55) 35%,transparent);border-radius:14px;padding:12px}
  .ordi-pruef textarea{width:100%;box-sizing:border-box;min-height:80px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);border-radius:12px;padding:9px 11px;font:inherit;font-size:15px;resize:vertical}
  .ordi-pruef label{display:flex;gap:8px;align-items:center;font-size:13px;color:#3F5A4F}.ordi-pruef .knoepfe{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
  .ordi-pruef .knoepfe button{border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 18%,transparent);background:#fff;border-radius:100px;padding:8px 13px;font:inherit;font-size:13.5px;font-weight:700;color:#0B3B2E;cursor:pointer}
  .ordi-pruef .knoepfe button.ja{background:#0B3B2E;color:#fff;border-color:#0B3B2E}
  .ordi-punkt{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#E4572E;border:2px solid #fff}
  @media print{.ordi-knopf,.ordi-panel{display:none!important}}`;
  document.head.appendChild(css);

  let knopf = null, panel = null;
  let aktiveDatei = null; // gerade geöffnete Datei: { name, inhalt, seit }
  const verlauf = lies('ordi.verlauf', []).slice(-20);
  const sichern = () => setz('ordi.verlauf', verlauf.slice(-20).map((m) => (m.html && m.html.includes('ordi-vorschau') ? { ...m, html: m.html.replace(/<img class="ordi-vorschau"[^>]*>/g, '') } : m)));

  // Ordi sitzt oben in der Kopfzeile neben „Suchen“, damit er nichts auf der Seite verdeckt.
  // Nur wo es keine Kopfzeile gibt, schwebt er unten rechts.
  function kopfOrt() {
    const su = document.querySelector('.su-knopf');
    if (su && su.parentElement) return { el: su.parentElement, vor: su };
    const r = document.querySelector('.nv-rechts'); if (r) return { el: r, vor: r.firstChild };
    const w = document.querySelector('header.kopfzeile .wrap'); if (w) return { el: w, vor: null };
    const h = document.querySelector('body > header, main > header, .wrap > header, .seite > header');
    if (h) {
      let platz = h.querySelector(':scope > .ordi-kopfplatz');
      if (!platz) { platz = document.createElement('span'); platz.className = 'ordi-kopfplatz'; const letzt = h.lastElementChild; if (letzt && h.children.length > 1) platz.appendChild(letzt); h.appendChild(platz); }
      return { el: platz, vor: null };
    }
    return null;
  }
  function knopfZeigen(versuch = 0) {
    if (lies(AUS, false) || knopf) return;
    const ort = kopfOrt();
    // Kurz warten, bis Menü und Suche eingebaut sind
    if ((!ort || !document.querySelector('.su-knopf')) && versuch < 6) { setTimeout(() => knopfZeigen(versuch + 1), 250); return; }
    knopf = document.createElement('button'); knopf.type = 'button'; knopf.setAttribute('aria-label', 'Ordi fragen'); knopf.title = 'Ordi fragen';
    knopf.addEventListener('click', () => (panel ? zu() : auf()));
    if (ort) { knopf.className = 'ordi-kopfknopf'; knopf.innerHTML = GESICHT(26); ort.el.insertBefore(knopf, ort.vor); }
    else { knopf.className = 'ordi-knopf'; knopf.innerHTML = GESICHT(34); document.body.appendChild(knopf); }
    // Einmal pro Tag kurz Hallo sagen
    const heute = new Date().toLocaleDateString('sv-SE');
    if (lies('ordi.hallo', '') !== heute) {
      setz('ordi.hallo', heute);
      setTimeout(() => { if (!knopf || panel) return; const b = document.createElement('span'); b.className = 'ordi-blase'; b.textContent = 'Fragen? Ich bin Ordi 👋'; knopf.appendChild(b); setTimeout(() => b.remove(), 5000); }, 2500);
    }
  }
  function zu() { if (panel) { panel.remove(); panel = null; } try { Mensch.ende(); } catch {} }
  function auf() {
    zu();
    panel = document.createElement('div'); panel.className = 'ordi-panel' + (knopf && knopf.classList.contains('ordi-kopfknopf') && innerWidth > 820 ? ' oben' : ''); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ordi');
    panel.innerHTML = `<div class="ordi-kopf">${GESICHT(36)}<div><b>Ordi</b><small>Ihr Buchhalter und Helfer</small></div><button class="ordi-menue" data-ordi-menue title="Optionen">⋯</button><button data-ordi-zu aria-label="Schliessen">×</button></div>
      <div class="ordi-mensch-leiste" id="ordiMensch"><span>Unsicher? Ein Mensch aus unserem Team prüft es.</span><button type="button" data-ordi-mensch>Prüfen lassen</button></div>
      <div class="ordi-verlauf" id="ordiVerlauf"></div>
      <div class="ordi-dateibar" hidden></div>
      <form class="ordi-eingabe"><button type="button" class="ordi-datei" data-ordi-datei aria-label="Foto oder Datei senden" title="Foto oder Datei senden"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5"/></svg></button><input type="file" id="ordiDateien" multiple accept="image/*,application/pdf,.pdf,.csv,.xml,.xlsx,.xls,.txt,.053,.docx,.doc,.md,.json,.html,.htm,.eml,.rtf,.odt,.ods" hidden><input id="ordiFrage" placeholder="Frage stellen oder Datei senden …" autocomplete="off" enterkeyhint="send"><button>Senden</button></form>`;
    document.body.appendChild(panel);
    if (!verlauf.length) {
      verlauf.push({ rolle: 'ordi', text: 'Hallo! Ich bin Ordi, Ihr Buchhalter in Ordasio. Sagen Sie mir einfach, was zu tun ist, zum Beispiel: «Buche 45.20 Migros als Material», «Alle Swisscom-Buchungen unter Telefon», «Rechnung 1023 ist bezahlt» oder «Rechnung an Müller über 3 Stunden à 95». Fotos und PDFs von Belegen schicken Sie mit der Büroklammer, ich lese und buche sie. Ich frage immer, bevor ich etwas ausführe.' });
      verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[0], fakt: true });
    } else if (Math.random() < 0.35) verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[1 + Math.floor(Math.random() * (FUNFACTS.length - 1))], fakt: true });
    malen();
    panel.querySelector('#ordiDateien').addEventListener('change', (e) => { const l = [...e.target.files]; e.target.value = ''; if (l.length) dateienSenden(l); });
    // Dateien auch aufs Fenster ziehen
    panel.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.stopPropagation(); } });
    panel.addEventListener('drop', (e) => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); dateienSenden([...e.dataTransfer.files]); });
    panel.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = panel.querySelector('#ordiFrage'); const t = f.value.trim(); if (!t) return; f.value = ''; if (Mensch.fall) Mensch.schreiben(t); else fragen(t); });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-ordi-zu]')) zu();
      const c = e.target.closest('[data-ordi-frage]'); if (c) fragen(c.dataset.ordiFrage);
      if (e.target.closest('[data-ordi-menue]')) menue();
      if (e.target.closest('[data-ordi-datei]')) panel.querySelector('#ordiDateien').click();
      const bk = e.target.closest('[data-ordi-bank]'); if (bk) alsKontoauszug(bk.dataset.ordiBank);
      const le = e.target.closest('[data-ordi-lesen]'); if (le) { const f = temp.get(le.dataset.ordiLesen); if (f) dateiLesen(f, '', true); }
      if (e.target.closest('[data-ordi-dateizu]')) { aktiveDatei = null; verlauf.push({ rolle: 'ordi', text: 'Datei geschlossen. Fragen gehen jetzt wieder an mich allgemein.' }); sichern(); malen(); }
      if (e.target.closest('[data-ordi-ja]') || e.target.closest('[data-ordi-nein]')) aktionAntwort(!!e.target.closest('[data-ordi-ja]'));
      if (e.target.closest('[data-ordi-mensch]')) Mensch.start();
      if (e.target.closest('[data-ordi-pruef-senden]')) Mensch.senden();
      if (e.target.closest('[data-ordi-pruef-ab]')) Mensch.zurueck();
      const pf = e.target.closest('[data-ordi-fall]'); if (pf) Mensch.oeffnen(pf.dataset.ordiFall);
    });
    Mensch.leiste();
    setTimeout(() => { const f = panel && panel.querySelector('#ordiFrage'); if (f && !matchMedia('(max-width: 820px)').matches) f.focus(); }, 50);
  }
  function menue() {
    verlauf.push({ rolle: 'ordi', text: 'Was möchten Sie?', chips: ['Funfact', 'Verlauf löschen', 'Ordi ausblenden'] });
    malen();
  }
  const md = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="word-break:break-all">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\n)(\d+)\. /g, '$1<b>$2.</b> ');
  function malen() {
    const v = panel && panel.querySelector('#ordiVerlauf'); if (!v) return;
    v.innerHTML = verlauf.map((m) => `<div class="ordi-msg ${m.rolle} ${m.fakt ? 'fakt' : ''}">${m.html || md(m.text)}${m.ziel ? `<br><a class="ordi-hin" href="${esc(m.ziel)}">Hinführen ›</a>` : ''}</div>${m.chips ? `<div class="ordi-chips">${m.chips.map((c) => `<button data-ordi-frage="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}`).join('')
      + (verlauf.length <= 2 ? `<div class="ordi-chips">${vorschlaege().map((c) => `<button data-ordi-frage="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : '');
    v.scrollTop = v.scrollHeight;
    const db = panel.querySelector('.ordi-dateibar');
    if (db) { const an = aktiveDatei && Date.now() - aktiveDatei.seit < 30 * 60000; db.hidden = !an; if (an) db.innerHTML = `<span>Fragen zur Datei:</span><b>${esc(aktiveDatei.name)}</b><button type="button" data-ordi-dateizu title="Datei schliessen">×</button>`; }
  }
  const S = () => window.NasuviaSuche;
  function lokal(frage) {
    let l = S() ? S().finden(frage) : [];
    // Passend zum Bereich, in dem man gerade ist, zuerst (wenn unter den ersten drei)
    const hierA = l.slice(0, 3).find((a) => a.bereich === BEREICH[hier]);
    if (hierA) l = [hierA, ...l.filter((a) => a !== hierA)];
    if (!l.length) return { text: 'Dazu habe ich in der Anleitung nichts gefunden. Versuchen Sie es mit anderen Worten, oder fragen Sie uns direkt: WhatsApp oder Telefon 079 821 84 08, E-Mail support@ordasio.ch. Wir helfen gerne, auch auf Schweizerdeutsch.' };
    const a = l[0];
    return { html: `<b>${esc(a.titel)}</b><ol>${a.schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`, text: a.titel, ziel: a.ziel, chips: l.slice(1, 4).map((x) => x.titel) };
  }
  async function token() {
    try { if (window.NASUVIA_SB) { const { data } = await window.NASUVIA_SB.auth.getSession(); if (data.session) return data.session.access_token; } } catch {}
    try { const s = JSON.parse(localStorage.getItem(K.speicher) || 'null'); return (s && s.access_token) || ''; } catch { return ''; }
  }
  let kiAus = false;
  async function mitKi(frage, datei) {
    if (kiAus || !K.produkt || !K.url) return null;
    const t = await token(); if (!t) return null;
    const artikel = (S() ? S().finden(frage) : []).slice(0, 6).map((a) => ({ titel: a.titel, schritte: a.schritte }));
    try {
      const r = await fetch(K.url + '/functions/v1/ordi', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, apikey: K.key },
        body: JSON.stringify({ frage, datei: datei || undefined, artikel, kontext: window.OrdiAktionen ? await window.OrdiAktionen.kontext().catch(() => null) : null, heute: new Date().toLocaleDateString('sv-SE'), bereich: BEREICH[hier] || hier, paket: (window.NASUVIA_LIZENZ || {}).paket || '', verlauf: verlauf.filter((m) => !m.fakt && !m.denkt).slice(-6).map((m) => ({ rolle: m.rolle, text: m.text })) }) });
      if (r.status === 501) { kiAus = true; return null; }
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 && j.fehler) return { text: j.fehler, aktion: null };  // Schutz: Tageslimit, Tempo, Sperre
      if (!r.ok || (!j.text && !j.aktion)) return null;
      const a = (S() ? S().finden(frage) : [])[0];
      return { text: j.text || '', aktion: j.aktion || null, ziel: !j.aktion && a && a.ziel };
    } catch { return null; }
  }
  async function aktionAntwort(ja) {
    const m = [...verlauf].reverse().find((x) => x.aktion && !x.erledigt); if (!m) return;
    m.erledigt = true; m.html = m.html.replace(/<div class="ordi-chips"[\s\S]*?<\/div><\/div>$/, '</div>');
    if (!ja) { verlauf.push({ rolle: 'ordi', text: 'Gut, ich mache nichts.' }); sichern(); malen(); return; }
    verlauf.push({ rolle: 'ordi', html: '<span class="ordi-tippt"><span></span><span></span><span></span></span>', text: '', denkt: true }); malen();
    let t; try { t = await window.OrdiAktionen.ausfuehren(m.aktion); } catch (f) { t = 'Das hat nicht geklappt: ' + (f.message || f); }
    verlauf.pop(); verlauf.push({ rolle: 'ordi', text: t }); sichern(); malen();
  }
  async function fragen(frage, mitDatei, ohneFrage) {
    const n = frage.toLowerCase();
    if (n === 'ordi ausblenden') { setz(AUS, true); zu(); if (knopf) { knopf.remove(); knopf = null; } if (window.UI && UI.hinweis) UI.hinweis('Ordi ist ausgeblendet. Unter „Anleitung“ holen Sie ihn jederzeit zurück.'); return; }
    if (n === 'verlauf löschen') { verlauf.length = 0; sichern(); auf(); return; }
    if (!ohneFrage) verlauf.push({ rolle: 'ich', text: frage });
    if (!mitDatei && /fun ?fact|wusstest|weisst du was|erzähl/.test(n)) { verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[Math.floor(Math.random() * FUNFACTS.length)], fakt: true }); sichern(); malen(); return; }
    if (/^(hallo|hoi|hey|grüezi|gruezi|salü|sali|guten (tag|morgen|abend))\b/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Hoi! Wie kann ich helfen?', chips: vorschlaege() }); sichern(); malen(); return; }
    if (/^(danke|merci|super|toll|perfekt)/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Gern geschehen! 😊' }); sichern(); malen(); return; }
    if (/wer bist du|was bist du|wie heisst du/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Ich bin Ordi, der Helfer in Ordasio. Der Name kommt von «Ordnung». Ich kenne die ganze Anleitung und zeige Ihnen den Weg.' }); sichern(); malen(); return; }
    verlauf.push({ rolle: 'ordi', html: '<span class="ordi-tippt"><span></span><span></span><span></span></span>', text: '', denkt: true }); malen();
    // Aufgaben und eigene Zahlen zuerst selbst erkennen, dann KI, sonst Anleitung
    // Bezieht sich die Frage auf eine Datei, die gerade offen ist? Dann liest die KI den Inhalt mit
    const datei = mitDatei || (aktiveDatei && Date.now() - aktiveDatei.seit < 30 * 60000 ? aktiveDatei.inhalt : null);
    let auf = null; if (!datei) { try { auf = window.OrdiAktionen ? await window.OrdiAktionen.erkennen(frage) : null; } catch {} }
    const ki = auf ? null : await mitKi(frage, datei);
    if (datei && !ki) { verlauf.pop(); verlauf.push({ rolle: 'ordi', text: 'Ich konnte die Datei gerade nicht lesen. Bitte versuchen Sie es nochmals. Für Dateien muss ich mit dem Internet verbunden und Sie in Ordasio angemeldet sein.' }); sichern(); malen(); return; }
    verlauf.pop();
    let a = (auf && auf.aktion) || (ki && ki.aktion);
    // KI-Vorschläge ebenfalls an die Lizenz anpassen
    if (!auf && a && window.OrdiAktionen && OrdiAktionen.pruefen) { const p = OrdiAktionen.pruefen(a); if (p && !p.aktion) { a = null; auf = p; } else if (p) { a = p.aktion; if (p.hinweis) verlauf.push({ rolle: 'ordi', html: p.hinweis.html, text: p.hinweis.text }); } }
    if (a && window.OrdiAktionen && OrdiAktionen.vorbereiten) { try { a = await OrdiAktionen.vorbereiten(a); } catch {} }
    if (auf && auf.vorher) verlauf.push({ rolle: 'ordi', html: auf.vorher.html, text: auf.vorher.text });
    if (a && window.OrdiAktionen) verlauf.push({ rolle: 'ordi', html: (ki && ki.text ? md(ki.text) + '<br>' : '') + window.OrdiAktionen.karte(a), text: 'Vorschlag', aktion: a });
    else if (auf) verlauf.push({ rolle: 'ordi', ...auf });
    else verlauf.push(ki ? { rolle: 'ordi', text: ki.text, ziel: ki.ziel } : { rolle: 'ordi', ...lokal(frage) });
    if (datei && aktiveDatei && !aktiveDatei.chips) { aktiveDatei.chips = true; dateiChips(); }
    sichern(); malen();
  }
  /* ---------- Fotos und Dateien an Ordi: Belege lesen und buchen, Kontoauszüge einlesen ---------- */
  const temp = new Map();
  const istBank = (f) => !/\.(docx?|odt|pdf)$/i.test(f.name || '') && (/\.(csv|xml|xlsx?|053)$/i.test(f.name || '') || /csv|^text\/xml|^application\/xml|spreadsheetml|ms-excel/.test(f.type || ''));
  const skriptLaden = (name) => new Promise((ok) => { const sc = document.createElement('script'); sc.src = new URL(name, skript.src).href; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
  async function alsKontoauszug(k) {
    const f = temp.get(k); if (!f) { verlauf.push({ rolle: 'ordi', text: 'Die Datei ist nicht mehr da. Bitte nochmals senden.' }); sichern(); malen(); return; }
    if (window.NB && NB.bankImport) { zu(); NB.bankImport(f); return; }
    try {
      const db = await new Promise((ok, x) => { const r = indexedDB.open('ordasio-ordi', 1); r.onupgradeneeded = () => r.result.createObjectStore('datei'); r.onsuccess = () => ok(r.result); r.onerror = () => x(r.error); });
      await new Promise((ok, x) => { const t = db.transaction('datei', 'readwrite'); t.objectStore('datei').put(f, 'bank'); t.oncomplete = ok; t.onerror = () => x(t.error); }); db.close();
      verlauf.push({ rolle: 'ordi', text: 'Ich öffne die Buchhaltung und lese den Kontoauszug ein …' }); sichern(); malen();
      location.href = new URL('?bereich=buchhaltung&aktion=ordiDatei', new URL('.', new URL('ordi.js', skript.src))).href;
    } catch { verlauf.push({ rolle: 'ordi', text: 'Bitte öffnen Sie die Buchhaltung und laden Sie den Auszug dort unter „Bankauszug importieren“.' }); sichern(); malen(); }
  }
  /* ---------- Inhalt von Dateien lesen: Ordi sieht PDF und Fotos direkt, Word, Excel und Text als Text ---------- */
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const cdnLaden = (url, pruef) => (pruef() ? Promise.resolve() : new Promise((ok, x) => { const sc = document.createElement('script'); sc.src = url; sc.onload = ok; sc.onerror = () => x(new Error('Keine Verbindung zum Lesen dieser Datei.')); document.head.appendChild(sc); }));
  const istTextDatei = (f) => /\.(txt|csv|md|json|xml|html?|eml|rtf|053)$/i.test(f.name || '') || /^text\//.test(f.type || '') || /json|xml/.test(f.type || '');
  const istWord = (f) => /\.(docx|odt)$/i.test(f.name || '') || /wordprocessingml|opendocument\.text/.test(f.type || '');
  const istTabelle = (f) => /\.(xlsx|xls|ods)$/i.test(f.name || '') || /spreadsheet|ms-excel/.test(f.type || '');
  async function dateiInhalt(f) {
    const name = String(f.name || 'Datei').slice(0, 120), max = 60000;
    if (/^image\//.test(f.type) || /pdf/.test(f.type) || /\.pdf$/i.test(f.name || '')) {
      if (!window.Leser) await skriptLaden('leser.js');
      const v = await Leser.vorbereiten(f);
      if (!v || !v.daten || v.daten.length > 7e6) throw new Error('Die Datei ist zu gross. Höchstens etwa 5 MB, bei PDF am besten nur die wichtigen Seiten.');
      return { name, mime: v.mime, daten: v.daten };
    }
    let text = '';
    if (istWord(f)) {
      await cdnLaden(CDN + 'jszip/3.10.1/jszip.min.js', () => window.JSZip);
      const zip = await window.JSZip.loadAsync(await f.arrayBuffer());
      const xml = await (zip.file('word/document.xml') || zip.file('content.xml')).async('string');
      text = xml.replace(/<\/(w:p|text:p|text:h)>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    } else if (istTabelle(f)) {
      await cdnLaden(CDN + 'xlsx/0.18.5/xlsx.full.min.js', () => window.XLSX);
      const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
      text = wb.SheetNames.slice(0, 6).map((n) => `## Blatt ${n}\n` + window.XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ';', dateNF: 'dd.mm.yyyy' })).join('\n\n');
    } else if (istTextDatei(f)) {
      const buf = await f.arrayBuffer(); text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('�')) { try { text = new TextDecoder('windows-1252').decode(buf); } catch {} }
      if (/\.html?$/i.test(f.name || '')) text = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
    } else if (/\.doc$/i.test(f.name || '')) throw new Error('Alte Word-Dateien (.doc) kann ich nicht lesen. Bitte als .docx oder PDF speichern.');
    else throw new Error('Diese Art Datei kann ich nicht lesen. Ich lese PDF, Fotos, Word (.docx), Excel und Textdateien.');
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) throw new Error('In der Datei steht kein lesbarer Text.');
    return { name, text: text.slice(0, max), gekuerzt: text.length > max };
  }
  function dateiChips() {
    if (!aktiveDatei) return;
    verlauf.push({ rolle: 'ordi', html: `<div class="ordi-chips"><button data-ordi-frage="Was muss ich jetzt tun? Gibt es Fristen?">Was muss ich tun?</button><button data-ordi-frage="Trag die Fristen und Termine aus der Datei als Erinnerungen ein.">Fristen eintragen</button><button data-ordi-frage="Fasse die Datei in 5 Punkten zusammen.">Zusammenfassen</button><button data-ordi-dateizu>Datei schliessen</button></div>`, text: '', chipsDatei: true });
  }
  async function dateiLesen(f, frage, schonGezeigt) {
    if (!schonGezeigt) verlauf.push({ rolle: 'ich', text: 'Datei: ' + (f.name || 'Foto') + (frage ? ' – ' + frage : ''), html: `${esc(f.name || 'Foto')}${frage ? '<br>' + esc(frage) : ''}` });
    verlauf.push({ rolle: 'ordi', html: '<span class="ordi-tippt"><span></span><span></span><span></span></span> Ich lese die Datei …', text: '', denkt: true }); malen();
    let inhalt;
    try { inhalt = await dateiInhalt(f); } catch (x) { verlauf.pop(); verlauf.push({ rolle: 'ordi', text: x.message || 'Die Datei liess sich nicht lesen.' }); sichern(); malen(); return; }
    verlauf.pop(); malen();
    aktiveDatei = { name: inhalt.name, inhalt, seit: Date.now() };
    const q = frage || 'Was ist das für ein Dokument? Fasse kurz zusammen, was drinsteht, und sag mir, ob ich etwas tun muss (Fristen, Beträge, Termine).';
    await fragen(q, inhalt, true);
  }
  async function dateienSenden(liste) {
    if (!panel) auf();
    const eingabe = panel.querySelector('#ordiFrage'), hinweis = eingabe.value.trim(); eingabe.value = '';
    for (const f of liste.slice(0, 10)) {
      const k = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); temp.set(k, f);
      const bild = /^image\//.test(f.type) ? URL.createObjectURL(f) : '';
      verlauf.push({ rolle: 'ich', text: 'Datei: ' + (f.name || 'Foto') + (hinweis ? ' – ' + hinweis : ''), html: `${esc(f.name || 'Foto')}${hinweis ? '<br>' + esc(hinweis) : ''}${bild ? `<img class="ordi-vorschau" src="${bild}" alt="">` : ''}` });
      const fragtWas = hinweis && !/^(buch|beleg|als (beleg|ausgabe|einnahme)|einnahme|ausgabe)\b/i.test(hinweis);
      if (istBank(f) && !fragtWas) { verlauf.push({ rolle: 'ordi', html: `Das sieht nach einem Kontoauszug aus.<div class="ordi-chips" style="margin-top:8px"><button data-ordi-bank="${k}">Als Kontoauszug einlesen</button><button data-ordi-lesen="${k}">Nur lesen und Fragen stellen</button></div>`, text: 'Kontoauszug' }); sichern(); malen(); continue; }
      // Frage zur Datei oder kein Foto/PDF (Word, Excel, Text): Inhalt lesen statt als Beleg buchen
      const bildOderPdf = /^image\//.test(f.type) || /pdf/.test(f.type) || /\.pdf$/i.test(f.name || '');
      if (fragtWas || !bildOderPdf) { await dateiLesen(f, hinweis, true); continue; }
      if (f.size > 10e6) { verlauf.push({ rolle: 'ordi', text: 'Die Datei ist zu gross (höchstens 10 MB).' }); sichern(); malen(); continue; }
      verlauf.push({ rolle: 'ordi', html: '<span class="ordi-tippt"><span></span><span></span><span></span></span> Ich lese den Beleg …', text: '', denkt: true }); malen();
      if (!window.Leser) await skriptLaden('leser.js');
      if (!window.OrdiAktionen) await skriptLaden('ordi-aktionen.js');
      let r = null;
      try { const kats = await OrdiAktionen.kategorien(); r = window.Leser ? await Leser.ki(f, 'beleg', { kategorien: [...kats.ausgabe, ...kats.einnahme].map((x) => ({ id: x.id, name: x.name })) }) : null; } catch (x) { r = { fehler: x.message }; }
      verlauf.pop();
      if (!r) { verlauf.push({ rolle: 'ordi', text: 'Belege lese ich mit der KI. Dafür müssen Sie in Ordasio angemeldet sein. Sie können den Beleg sonst in der Buchhaltung unter „Belege hochladen“ erfassen.' }); sichern(); malen(); continue; }
      if (r.fehler) { verlauf.push({ rolle: 'ordi', text: r.fehler }); sichern(); malen(); continue; }
      const w = r.felder || {};
      if (w.lesbar === false || !w.betrag) {
        // Kein Beleg: Ordi liest, was es ist (Brief, Vertrag, Mahnung …), und sagt, was zu tun ist
        verlauf.push({ rolle: 'ordi', html: `Das ist kein Beleg zum Buchen. Ich lese, was drinsteht …${/pdf/.test(f.type) ? '<div class="ordi-chips" style="margin-top:8px"><button data-ordi-bank="' + k + '">Ist ein Kontoauszug, einlesen</button></div>' : ''}`, text: 'Kein Beleg' }); sichern(); malen();
        await dateiLesen(f, '', true); continue;
      }
      const einnahme = /einnahme|verkauf|erhalten|bezahlt bekommen/i.test(hinweis);
      let a = { typ: 'buchung', art: einnahme ? 'einnahme' : 'ausgabe', betrag: Math.round(Number(w.betrag) * 100), datum: /^\d{4}-\d{2}-\d{2}$/.test(w.datum || '') ? w.datum : new Date().toLocaleDateString('sv-SE'),
        partner: w.lieferant || '', text: hinweis || w.beschreibung || '', kategorie: w.kategorie || '', mwst: w.mwst_satz != null ? w.mwst_satz : '', mwst_betrag: w.mwst_betrag != null ? Math.round(Number(w.mwst_betrag) * 100) : '',
        zahlung: w.zahlung || '', _belegTemp: OrdiAktionen.belegMerken(f) };
      try { a = await OrdiAktionen.vorbereiten(a); } catch {}
      const unsicher = (w.unsicher || []).length ? `<br><small>Bitte prüfen: ${esc(w.unsicher.join(', '))}</small>` : '';
      verlauf.push({ rolle: 'ordi', html: `Gelesen. Soll ich das so buchen?${unsicher}${w.offen ? '<br><small>Das ist eine offene Rechnung' + (w.faellig ? ', zahlbar bis ' + esc(w.faellig) : '') + '. Ich buche sie als Ausgabe, sobald Sie Ja sagen.</small>' : ''}` + OrdiAktionen.karte(a), text: 'Beleg gelesen', aktion: a });
      sichern(); malen();
    }
  }
  // Text ins Eingabefeld legen, damit man ihn anpassen und selbst abschicken kann
  function vorschlag(text) { if (!panel) auf(); const f = panel && panel.querySelector('#ordiFrage'); if (f) { f.value = text; f.focus(); try { f.setSelectionRange(text.length, text.length); } catch {} } }
  /* ---------- Prüfung durch einen Menschen: Fall an das Ordasio-Team, danach Chat im Ordi-Fenster ---------- */
  const Mensch = (() => {
    let faelle = [], fall = null, nachrichten = [], uhr = null;
    async function rest(pfad, o = {}) {
      const t = await token(); if (!t || !K.produkt) throw new Error('Bitte zuerst anmelden.');
      const r = await fetch(K.url + '/rest/v1/' + pfad, { method: o.method || 'GET', headers: { apikey: K.key, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...(o.prefer ? { Prefer: o.prefer } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
      if (!r.ok) throw new Error('Verbindung zum Team fehlgeschlagen (' + r.status + ').');
      return r.status === 204 ? null : r.json().catch(() => null);
    }
    const ungelesen = (f) => f.team_gelesen && (!f.kunde_gelesen || f.team_gelesen > f.kunde_gelesen);
    async function laden() { try { faelle = await rest('support_faelle?select=id,titel,status,zuletzt,kunde_gelesen,team_gelesen&order=zuletzt.desc&limit=20') || []; } catch { faelle = []; } return faelle; }
    function leiste() {
      const l = panel && panel.querySelector('#ordiMensch'); if (!l) return;
      if (!K.produkt) { l.remove(); return; }
      const neu = faelle.find(ungelesen), offen = faelle.find((f) => f.status !== 'erledigt');
      l.classList.toggle('neu', !!neu);
      if (fall) l.innerHTML = `<span>Chat mit dem Ordasio-Team</span><button type="button" data-ordi-pruef-ab>Zurück zu Ordi</button>`;
      else if (neu) l.innerHTML = `<span><b>Neue Antwort vom Team</b></span><button type="button" data-ordi-fall="${neu.id}">Lesen</button>`;
      else if (offen) l.innerHTML = `<span>Ihre Anfrage: ${esc(offen.status === 'in_arbeit' ? 'wird bearbeitet' : 'ist beim Team')}</span><button type="button" data-ordi-fall="${offen.id}">Öffnen</button>`;
      else l.innerHTML = `<span>Unsicher? Ein Mensch aus unserem Team prüft es.</span><button type="button" data-ordi-mensch>Prüfen lassen</button>`;
    }
    function start() {
      const letzte = [...verlauf].reverse().find((m) => m.rolle === 'ich');
      verlauf.push({ rolle: 'ordi', html: `<b>Von unserem Team prüfen lassen</b><br>Beschreiben Sie kurz, was geprüft werden soll. Eine Person aus dem Ordasio-Team schaut es an und antwortet hier im Chat, meist am gleichen Arbeitstag.
        <div class="ordi-pruef" style="margin-top:8px"><textarea id="ordiPruefText" maxlength="4000" placeholder="z. B. Ist die Buchung der Leasingrate richtig?">${esc(letzte ? letzte.text : '')}</textarea>
        <label><input type="checkbox" id="ordiPruefVerlauf" checked> Den bisherigen Ordi-Verlauf mitschicken</label>
        <div class="knoepfe"><button type="button" class="ja" data-ordi-pruef-senden>An das Team senden</button></div></div>`, text: 'Prüfung anfragen', pruef: true });
      malen();
      setTimeout(() => { const t = panel && panel.querySelector('#ordiPruefText'); if (t) t.focus(); }, 50);
    }
    async function senden() {
      const ta = panel && panel.querySelector('#ordiPruefText'); if (!ta) return;
      const text = ta.value.trim(); if (text.length < 3) { ta.focus(); return; }
      const mitVerlauf = panel.querySelector('#ordiPruefVerlauf').checked;
      const knopfS = panel.querySelector('[data-ordi-pruef-senden]'); knopfS.disabled = true; knopfS.textContent = 'Wird gesendet …';
      try {
        const lz = window.NASUVIA_LIZENZ || {};
        const v = mitVerlauf ? verlauf.filter((m) => !m.fakt && !m.denkt && !m.pruef).slice(-14).map((m) => ({ rolle: m.rolle, text: String(m.text || '').slice(0, 1500) })) : null;
        const f = await rest('support_faelle', { method: 'POST', prefer: 'return=representation', body: { titel: text.split('\n')[0].slice(0, 120), firma: lz.firma || lz.name || '', ordi_verlauf: v } });
        const neu = Array.isArray(f) ? f[0] : f;
        await rest('support_nachrichten', { method: 'POST', prefer: 'return=minimal', body: { fall_id: neu.id, von: 'kunde', name: lz.name || '', text } });
        // Team per E-Mail informieren (klappt nur, wenn der Versand eingerichtet ist)
        try { const t = await token(); fetch(K.url + '/functions/v1/mail-senden', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: K.key, Authorization: 'Bearer ' + t }, body: JSON.stringify({ aktion: 'senden', art: 'support', an: 'support@ordasio.ch', betreff: 'Ordi: Prüfung angefragt von ' + (lz.firma || lz.name || 'Kunde'), text: text + '\n\nAntworten unter https://app.ordasio.ch/team/' }) }).catch(() => {}); } catch {}
        const m = verlauf.find((x) => x.pruef && !x.erledigt); if (m) { m.erledigt = true; m.html = '<b>Prüfung angefragt</b><br>' + esc(text); }
        sichern(); await laden(); await oeffnen(neu.id);
      } catch (x) { knopfS.disabled = false; knopfS.textContent = 'An das Team senden'; verlauf.push({ rolle: 'ordi', text: x.message || 'Senden hat nicht geklappt.' }); malen(); }
    }
    async function oeffnen(id) {
      fall = faelle.find((f) => f.id === id) || { id };
      await holen(); leiste(); chatMalen();
      try { await rest('rpc/support_gelesen', { method: 'POST', body: { p_fall: id } }); await laden(); } catch {}
      stopp(); uhr = setInterval(async () => { if (!panel || !fall) return stopp(); const vorher = nachrichten.length; await holen(); if (nachrichten.length !== vorher) { chatMalen(); try { await rest('rpc/support_gelesen', { method: 'POST', body: { p_fall: fall.id } }); } catch {} } }, 8000);
    }
    async function holen() { try { nachrichten = await rest('support_nachrichten?select=id,von,name,text,erstellt&fall_id=eq.' + fall.id + '&order=erstellt.asc') || []; } catch { nachrichten = []; } }
    function chatMalen() {
      const v = panel && panel.querySelector('#ordiVerlauf'); if (!v || !fall) return;
      const zeit = (t) => new Date(t).toLocaleString('de-CH', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
      v.innerHTML = `<div class="ordi-msg ordi">Hier schreiben Sie direkt mit dem Ordasio-Team. Wir antworten so schnell wie möglich, meist am gleichen Arbeitstag.${fall.status === 'erledigt' ? '<br><b>Diese Anfrage ist erledigt.</b> Schreiben Sie einfach, wenn noch etwas offen ist.' : ''}</div>` +
        nachrichten.map((n) => `<div class="ordi-msg ${n.von === 'team' ? 'team' : 'ich'}"><span class="ordi-wer">${n.von === 'team' ? 'Ordasio-Team' + (n.name ? ' · ' + esc(n.name) : '') : 'Sie'} · ${esc(zeit(n.erstellt))}</span>${md(n.text)}</div>`).join('');
      v.scrollTop = v.scrollHeight;
      const f = panel.querySelector('#ordiFrage'); if (f) f.placeholder = 'Nachricht an das Team …';
    }
    async function schreiben(text) {
      if (!fall) return;
      const lz = window.NASUVIA_LIZENZ || {};
      nachrichten.push({ von: 'kunde', text, erstellt: new Date().toISOString() }); chatMalen();
      try { await rest('support_nachrichten', { method: 'POST', prefer: 'return=minimal', body: { fall_id: fall.id, von: 'kunde', name: lz.name || '', text: text.slice(0, 8000) } }); await holen(); chatMalen(); }
      catch (x) { nachrichten.push({ von: 'team', name: '', text: 'Nicht gesendet: ' + x.message, erstellt: new Date().toISOString() }); chatMalen(); }
    }
    function zurueck() { fall = null; stopp(); const f = panel && panel.querySelector('#ordiFrage'); if (f) f.placeholder = 'Frage stellen oder Datei senden …'; malen(); laden().then(leiste); }
    function stopp() { if (uhr) { clearInterval(uhr); uhr = null; } }
    function ende() { stopp(); fall = null; }
    // Punkt am Ordi-Knopf, wenn das Team geantwortet hat
    async function pruefenNeu() {
      if (!K.produkt) return;
      await laden();
      const neu = faelle.some(ungelesen);
      if (knopf) { knopf.style.position = knopf.style.position || 'relative'; let p = knopf.querySelector('.ordi-punkt'); if (neu && !p) { p = document.createElement('span'); p.className = 'ordi-punkt'; knopf.appendChild(p); } if (!neu && p) p.remove(); }
      leiste();
    }
    return { start, senden, oeffnen, schreiben, zurueck, stopp, ende, leiste, pruefenNeu, get fall() { return fall; } };
  })();
  setTimeout(() => Mensch.pruefenNeu().catch(() => {}), 2500);

  window.Ordi = { vorschlag, fragen: (t) => { if (!panel) auf(); fragen(t); }, auf, zu, an: () => { setz(AUS, false); knopfZeigen(); }, aus: () => { setz(AUS, true); zu(); if (knopf) { knopf.remove(); knopf = null; } }, istAn: () => !lies(AUS, false) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', knopfZeigen); else knopfZeigen();
})();
