// Tipps pro Bereich: eine kleine Leiste zum Wischen, die erklärt, wofür die Knöpfe sind.
// Wegklicken pro Bereich, alle wieder einschalten unter „Darstellung“ oder in der Anleitung.
(() => {
  if (window.Tipps) return;
  const AUS = 'ordasio.tippsAus';
  const lies = () => { try { return JSON.parse(localStorage.getItem(AUS) || '{}'); } catch { return {}; } };
  const setz = (v) => { try { localStorage.setItem(AUS, JSON.stringify(v)); } catch {} };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hier = (document.querySelector('script[data-hier]') || { dataset: {} }).dataset.hier || 'buchhaltung';
  const TIPPS = {
    buchhaltung: [['➕', 'Neue Buchung', 'Mit „+“ erfassen Sie Einnahmen und Ausgaben. Beleg fotografieren: Betrag, Datum und MWST werden gelesen.'],
      ['🏦', 'Bankauszug', 'Unter „Buchungen“ den Auszug aus dem E-Banking laden. Zahlungen werden vorgeschlagen und offenen Rechnungen zugeordnet.'],
      ['🧾', 'MWST', 'Die Abrechnung rechnet Ordasio mit den Ziffern des Formulars. Sie übertragen nur noch die Zahlen.'],
      ['🧩', 'Übersicht anpassen', 'Ganz oben bestimmen Sie, welche Karten die Übersicht zeigt.'],
      ['🤝', 'Treuhänder', 'Unter „Lizenz und Konto“ geben Sie Ihrem Treuhänder Zugang. Er sieht alles und stellt Rückfragen direkt hier.']],
    rechnungen: [['🧾', 'Rechnung in einer Minute', 'Kunde wählen, Positionen eintragen, „PDF“ oder „Senden“. Der QR-Zahlteil ist automatisch dabei.'],
      ['👀', 'Geöffnet?', 'In der Übersicht sehen Sie, ob der Kunde die Rechnung angeschaut hat.'],
      ['🎨', 'Ihr Design', '„Firma und Design“: Logo, Farben und Schrift. Logo zuschneiden und Grösse anpassen.'],
      ['🔁', 'Vorlagen', 'Häufige Texte und Zahlungsfristen als Standard speichern. Spart bei jeder Rechnung Zeit.']],
    zeit: [['📲', 'Handy-Link', 'Jeder Mitarbeiter bekommt einen eigenen Link. Kein Konto, kein Passwort.'],
      ['⚙️', 'So wird erfasst', 'Unter „Mitarbeiter“ wählen Sie Stempeluhr, Standort, Pausen und was Pflicht ist.'],
      ['🗓️', 'Einsatzplan', 'Einsätze zuweisen, mit Infos und Adresse. Mitarbeitende sehen sie auf dem Handy und im Kalender.'],
      ['🖨️', 'Rapporte', 'Stundenrapport drucken oder leere Rapport-Vorlagen für Arbeiten ohne Handy.']],
    privat: [['🏦', 'Kontoauszug', 'Auszug hochladen: Ausgaben werden sortiert. Sie sehen, wohin das Geld geht.'],
      ['📸', 'Rechnung per Foto', 'Foto oder PDF einer Rechnung: Betrag, Frist und Mahnstufe werden gelesen.'],
      ['🧮', 'Steuern', 'Unter „Planen“, „Steuern“ führt eine Anleitung Schritt für Schritt durch die Steuererklärung.'],
      ['🎯', 'Sparziele', 'Ziel setzen, einzahlen, Fortschritt sehen.']],
    ablage: [['📁', 'Eigene Ordner', 'Name, Farbe und Symbol bestimmen Sie. Dateien einfach hineinziehen.'],
      ['👤', 'Personal', 'Pro Person ein Dossier. Freigegebene Dokumente sieht der Mitarbeiter auf seinem Handy-Link.'],
      ['📣', 'Mitteilungen', 'Infos ans Team, mit Lesebestätigung.'],
      ['🏖️', 'Anträge', 'Ferien und Absenzen kommen vom Handy. Bewilligen mit einem Tipp.']],
    termine: [['🔗', 'Buchungslink', 'Ihr Link für Website und Instagram: Kunden buchen freie Termine selbst.'],
      ['🕘', 'Öffnungszeiten', 'Zeiten, Pausen und Ferien einstellen. Gebuchte Zeiten sind automatisch weg.'],
      ['📅', 'Kalender', 'Im Menü unter „Erinnerungen“ verbinden Sie die Termine mit Ihrem Handy-Kalender.']],
    lager: [['📦', 'Artikel', 'Artikel mit Mindestbestand erfassen. Ordasio zeigt, was nachbestellt werden muss.'],
      ['🔄', 'Bewegungen', 'Eingang, Ausgang oder Korrektur. Material lässt sich einem Auftrag zuordnen.'],
      ['📋', 'Aufträge ans Lager', 'Material bereitstellen oder Aufgaben ans Lager geben. Der Lagerist bestätigt auf dem Handy, Projektleiter sehen alles.']],
    vorlagen: [['🖨️', 'Drucken oder PDF', 'Vorlage wählen, links ausfüllen, rechts sehen Sie das fertige Blatt.'],
      ['📁', 'In die Ablage', 'Als PDF direkt beim richtigen Ordner und Mitarbeiter ablegen.']],
    start: [['👋', 'Willkommen', 'Hier sehen Sie, was als Nächstes zu tun ist. Erledigtes verschwindet.'],
      ['🧭', 'Menü', 'Oben rechts finden Sie alle Bereiche, Erinnerungen und die Darstellung. Oben links geht es zurück.'],
      ['💬', 'Ordi', 'Ordi oben rechts beantwortet Fragen und erledigt Aufgaben für Sie.']],
  };
  // Pro Bereich eine Idee „Mit Ordi ganz einfach“ (mit Knopf zum Ausprobieren)
  const ORDI = { buchhaltung: 'Buche 45.20 Migros als Material', rechnungen: 'Rechnung an Müller über 3 Stunden à 95', zeit: 'Füge Mitarbeiter Tom Keller hinzu und teile ihm den Auftrag Garten Huber zu',
    ablage: 'Schick dem Team: Morgen Start um 7 Uhr beim Lager', termine: 'Termin mit Frau Keller am Freitag um 14 Uhr', lager: 'Stelle 30 Meter Kabel für Robert bereit', start: 'Briefing jeden Montag um 7', privat: 'Erinnere mich am 30. an die Krankenkasse' };
  Object.keys(ORDI).forEach((k) => { if (TIPPS[k]) TIPPS[k].splice(1, 0, ['💬', 'Mit Ordi ganz einfach', 'Schreiben Sie Ordi: «' + ORDI[k] + '». Er bereitet alles vor, Sie bestätigen.', ORDI[k]]); });
  const ZIEL = { rechnungen: 'aside.panel' };
  const P = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const SYM = {
    '➕': '<path d="M12 5v14M5 12h14"/>', '🏦': '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z"/>',
    '🧾': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', '🧩': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    '🤝': '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/>', '👀': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    '🎨': '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.3-1-1.4-1-2.4 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.1-4-7.5-9-7.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>',
    '🔁': '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>', '📲': '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    '⚙️': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>', '🗓️': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>', '📅': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    '🖨️': '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>', '📸': '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
    '🧮': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>', '🎯': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    '📁': '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', '👤': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    '📣': '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 9a4 4 0 0 1 0 6"/>', '🏖️': '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z"/><path d="M12 12v9M8 21h8"/>',
    '🔗': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', '🕘': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    '📦': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', '🔄': '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    '📋': '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>', '👋': '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><path d="M8.5 14.5c1.9 1.6 5.1 1.6 7 0M9 10h.01M15 10h.01"/>',
    '🧭': '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>', '💬': '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  };
  const symbol = (ic) => P(SYM[ic] || '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>');
  const css = document.createElement('style');
  // Immer nur ganze Karten zeigen (Handy 1, Tablet 2, Computer 3), nichts ragt über den Rand; × unten neben den Punkten
  // Ruhige, helle Leiste: ein Tipp nach dem anderen, schlichte Symbole, Steuerung rechts (Handy: oben)
  css.textContent = `
  .tp-leiste{position:relative;flex-shrink:0;margin:0 0 18px;container-type:inline-size;font-family:inherit;border-radius:18px;
    background:var(--karte,#fff);border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 9%,transparent);box-shadow:0 1px 2px rgba(12,18,38,.04),0 12px 28px -24px rgba(12,18,38,.4)}
  .tp-innen{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px 14px;padding:14px 14px 14px 18px}
  .tp-leiste::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--elektrik,#0E7A55)}
  .tp-band{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
  .tp-band::-webkit-scrollbar{display:none}
  .tp-band{align-items:start;transition:height .2s ease;overflow-y:hidden}
  .tp-karte{min-width:0;scroll-snap-align:start;display:grid;grid-template-columns:40px minmax(0,1fr);gap:0 14px;align-items:center}
  .tp-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:var(--elektrik,#0E7A55);background:color-mix(in srgb,var(--elektrik,#0E7A55) 10%,transparent)}
  .tp-ic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  .tp-text{min-width:0}
  .tp-text small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--elektrik,#0E7A55);margin-bottom:1px}
  .tp-text b{display:block;font-size:14.5px;line-height:1.3;color:var(--tinte,#0A1F17)}
  .tp-text p{margin:2px 0 0;font-size:13.5px;line-height:1.45;color:var(--text,#3F5A4F)}
  .tp-ordi{margin-top:8px;border:0;border-radius:100px;padding:6px 13px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;background:var(--blau,#0B3B2E);color:#fff}
  .tp-steuer{display:flex;align-items:center;gap:4px}
  .tp-steuer button{flex:none;display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--text,#3F5A4F);cursor:pointer}
  .tp-steuer button:hover:not(:disabled){background:color-mix(in srgb,var(--blau,#0B3B2E) 7%,transparent);color:var(--tinte,#0A1F17)}
  .tp-steuer button:disabled{opacity:.3;cursor:default}
  .tp-steuer svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .tp-zahl{min-width:34px;text-align:center;font:600 12px/1 var(--mono,ui-monospace,monospace);color:var(--leise,#7C8499)}
  .tp-steuer .tp-zu{margin-left:4px;border-left:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);border-radius:0 50% 50% 0;width:36px}
  @container (max-width:520px){
    .tp-innen{grid-template-columns:minmax(0,1fr);padding:10px 10px 14px 16px;gap:4px}
    .tp-steuer{grid-row:1;justify-content:flex-end;margin:-4px -4px 0 0}
    .tp-steuer::before{content:"Tipp";margin-right:auto;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--elektrik,#0E7A55)}
    .tp-text small{display:none}
    .tp-karte{align-items:start}}
  @media print{.tp-leiste{display:none}}`;
  document.head.appendChild(css);
  function bauen() {
    const l = TIPPS[hier]; if (!l) return null;
    const d = lies(); if (d.alle === false || d[hier]) return null;
    // Nach 8 Besuchen eines Bereichs kennt man ihn: Tipps blenden sich von selbst aus (unter „Darstellung“ wieder einschalten)
    let besuche = {}; try { besuche = JSON.parse(localStorage.getItem('ordasio.tippsBesuche') || '{}'); } catch {}
    const nBesuch = (besuche[hier] || 0) + 1; besuche[hier] = nBesuch;
    try { if (!sessionStorage.getItem('tpGezaehlt.' + hier)) { sessionStorage.setItem('tpGezaehlt.' + hier, '1'); localStorage.setItem('ordasio.tippsBesuche', JSON.stringify(besuche)); } } catch {}
    if (nBesuch > 8 && !d.immer) return null;
    const el = document.createElement('div'); el.className = 'tp-leiste'; el.setAttribute('aria-label', 'Tipps');
    el.innerHTML = `<div class="tp-innen"><div class="tp-band">${l.map(([ic, t, x, f]) => `<div class="tp-karte"><span class="tp-ic">${symbol(ic)}</span><div class="tp-text"><small>Tipp</small><b>${esc(t)}</b><p>${esc(x)}</p>${f ? `<button type="button" class="tp-ordi" data-tp-ordi="${esc(f)}">Ausprobieren</button>` : ''}</div></div>`).join('')}</div>
      <div class="tp-steuer"><button type="button" data-tp="-1" aria-label="Vorheriger Tipp"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><span class="tp-zahl"></span><button type="button" data-tp="1" aria-label="Nächster Tipp"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button><button class="tp-zu" type="button" title="Tipps ausblenden" aria-label="Tipps ausblenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`;
    const band = el.querySelector('.tp-band'), zahl = el.querySelector('.tp-zahl');
    // Seiten = so viele ganze Karten, wie nebeneinander Platz haben
    const proSeite = () => { const k = band.querySelector('.tp-karte'); return k ? Math.max(1, Math.round((band.clientWidth + 16) / (k.offsetWidth + 16))) : 1; };
    const seiten = () => Math.ceil(l.length / proSeite());
    const jetzt = () => { const k = band.querySelector('.tp-karte'); return k ? Math.round(band.scrollLeft / ((k.offsetWidth + 16) * proSeite())) : 0; };
    const malen = () => {
      const n = seiten(), i = Math.min(jetzt(), n - 1);
      zahl.textContent = n > 1 ? `${i + 1} / ${n}` : '';
      const akt = band.children[i]; if (akt) band.style.height = akt.offsetHeight + 'px';
      el.querySelectorAll('[data-tp]').forEach((b) => { b.hidden = n <= 1; b.disabled = (b.dataset.tp === '-1' && i <= 0) || (b.dataset.tp === '1' && i >= n - 1); });
    };
    const gehe = (i) => { const k = band.querySelector('.tp-karte'); if (k) band.scrollTo({ left: Math.max(0, i) * (k.offsetWidth + 16) * proSeite(), behavior: 'smooth' }); };
    band.addEventListener('scroll', malen, { passive: true });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-tp]'); if (b) gehe(jetzt() + Number(b.dataset.tp)); const p = e.target.closest('[data-seite]'); if (p) gehe(Number(p.dataset.seite)); const o = e.target.closest('[data-tp-ordi]'); if (o) { if (window.Ordi && Ordi.vorschlag) Ordi.vorschlag(o.dataset.tpOrdi); else if (window.UI) UI.hinweis('Öffnen Sie Ordi oben rechts und schreiben Sie: «' + o.dataset.tpOrdi + '»'); } });
    if (window.ResizeObserver) new ResizeObserver(malen).observe(band);
    setTimeout(malen, 50);
    el.querySelector('.tp-zu').addEventListener('click', () => { const v = lies(); v[hier] = true; setz(v); el.remove(); beobachter && beobachter.disconnect(); if (window.UI && UI.hinweis && !v.gesagt) { v.gesagt = true; setz(v); UI.hinweis('Tipps ausgeblendet. Unter „Darstellung“ im Menü schalten Sie sie wieder ein.'); } });
    return el;
  }
  let beobachter = null;
  function einsetzen() {
    const ziel = document.querySelector(ZIEL[hier] || 'main'); if (!ziel) return;
    const el = bauen(); if (!el) return;
    // Etwas Luft zur Kopfzeile: die Leiste soll nicht an ihr kleben
    const abstand = () => requestAnimationFrame(() => {
      if (window.scrollY > 4 || !el.isConnected) return;
      const k = document.querySelector('.nv-kopfzeile, header.kopfzeile, .kopfzeile'); if (!k) return;
      el.style.marginTop = '';
      const d = el.getBoundingClientRect().top - k.getBoundingClientRect().bottom;
      if (d < 12) el.style.marginTop = Math.round(14 - Math.max(0, d)) + 'px';
    });
    const rein = () => { if (!ziel.querySelector(':scope > .tp-leiste') && !lies()[hier] && lies().alle !== false) { ziel.insertBefore(el, ziel.firstChild); abstand(); } };
    rein();
    // Seiten zeichnen ihren Inhalt neu: die Leiste bleibt oben
    beobachter = new MutationObserver(() => { if (!el.isConnected) rein(); });
    beobachter.observe(ziel, { childList: true });
  }
  window.Tipps = { an: () => { setz({ alle: true, immer: true }); try { localStorage.removeItem('ordasio.tippsBesuche'); } catch {} location.reload(); }, aus: () => { setz({ alle: false }); document.querySelectorAll('.tp-leiste').forEach((e) => e.remove()); }, istAn: () => lies().alle !== false };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(einsetzen, 400)); else setTimeout(einsetzen, 400);
})();
