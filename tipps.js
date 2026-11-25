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
      ['📋', 'Bereitstellen', 'Projektleiter fordern Material auf dem Handy an, der Lagerist stellt es bereit, der Bestand wird abgebucht.']],
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
  const css = document.createElement('style');
  // Immer nur ganze Karten zeigen (Handy 1, Tablet 2, Computer 3), nichts ragt über den Rand; × unten neben den Punkten
  css.textContent = `.tp-leiste{position:relative;flex-shrink:0;margin:0 0 16px;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--elektrik,#0E7A55) 9%,transparent),rgba(201,164,92,.12));padding:12px;font-family:inherit;container-type:inline-size;overflow:hidden}
  .tp-band{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}.tp-band::-webkit-scrollbar{display:none}
  @container (min-width:560px){.tp-band{grid-auto-columns:calc((100% - 10px) / 2)}}
  @container (min-width:880px){.tp-band{grid-auto-columns:calc((100% - 20px) / 3)}}
  .tp-karte{min-width:0;scroll-snap-align:start;background:rgba(255,255,255,.88);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:28px 1fr;gap:3px 10px;align-items:start}
  .tp-karte > span{font-size:22px;grid-row:span 3;height:28px;display:grid;place-items:center;align-self:start}.tp-karte > span .oi{width:22px;height:22px;vertical-align:0}.tp-ordi{grid-column:2;justify-self:start;margin-top:6px;border:0;border-radius:100px;padding:7px 14px;background:var(--blau,#0B3B2E);color:#fff;font:600 13px/1.2 inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.tp-karte b{font-size:14.5px;line-height:1.3;color:#0A1F17;align-self:center;min-height:20px}.tp-karte p{font-size:13px;color:#3F5A4F;margin:0;line-height:1.45}
  .tp-fuss{display:flex;align-items:center;gap:6px;margin-top:10px;min-height:28px}
  .tp-fuss button{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.85);color:#3F5A4F;font:600 15px/1 system-ui,sans-serif;cursor:pointer}.tp-fuss button svg{width:15px;height:15px;display:block;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .tp-fuss button:disabled{opacity:.35;cursor:default}
  .tp-fuss .tp-zu{margin-left:auto;width:auto;padding:0 12px;border-radius:100px;font:500 12.5px/1 inherit;font-family:inherit;gap:6px}
  .tp-punkte{display:flex;gap:5px;align-items:center;justify-content:center;flex:1}.tp-punkte i{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb,var(--blau,#0B3B2E) 20%,transparent);cursor:pointer;transition:width .2s}.tp-punkte i.an{background:var(--elektrik,#0E7A55);width:16px;border-radius:4px}
  .tp-fuss .tp-platz{flex:1}
  @media print{.tp-leiste{display:none}}`;
  // Kompakt und dunkel (überschreibt die Grundwerte oben)
  css.textContent += `
  .tp-leiste{margin:0 0 12px;border-radius:16px;padding:8px;background:linear-gradient(135deg,var(--blau,#0B3B2E),color-mix(in srgb,var(--blau,#0B3B2E) 78%,#000));box-shadow:0 10px 24px -18px rgba(0,0,0,.6)}
  .tp-band{gap:8px}
  @container (min-width:560px){.tp-band{grid-auto-columns:calc((100% - 8px) / 2)}}
  @container (min-width:880px){.tp-band{grid-auto-columns:calc((100% - 16px) / 3)}}
  .tp-karte{background:rgba(255,255,255,.07);border-radius:12px;padding:8px 10px;grid-template-columns:22px 1fr;gap:1px 9px}
  .tp-karte > span{height:20px;font-size:17px;color:#6EE7A8}.tp-karte > span .oi{width:17px;height:17px}
  .tp-karte b{font-size:13.5px;color:#fff;min-height:0}
  .tp-karte p{font-size:12.5px;line-height:1.4;color:rgba(255,255,255,.72);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .tp-ordi{margin-top:5px;padding:5px 11px;font-size:12px;background:#6EE7A8;color:#0A1F17}
  .tp-fuss{margin-top:6px;min-height:22px;gap:4px}
  .tp-fuss button{width:22px;height:22px;background:rgba(255,255,255,.12);color:#fff}.tp-fuss button svg{width:13px;height:13px}
  .tp-fuss .tp-zu{padding:0 9px;font-size:11.5px;background:transparent;color:rgba(255,255,255,.7)}
  .tp-fuss .tp-zu:hover{color:#fff;background:rgba(255,255,255,.1)}
  .tp-punkte i{width:5px;height:5px;background:rgba(255,255,255,.3)}.tp-punkte i.an{background:#6EE7A8;width:14px}`;
  document.head.appendChild(css);
  function bauen() {
    const l = TIPPS[hier]; if (!l) return null;
    const d = lies(); if (d.alle === false || d[hier]) return null;
    const el = document.createElement('div'); el.className = 'tp-leiste'; el.setAttribute('aria-label', 'Tipps');
    el.innerHTML = `<div class="tp-band">${l.map(([ic, t, x, f]) => `<div class="tp-karte"><span>${ic}</span><b>${esc(t)}</b><p>${esc(x)}</p>${f ? `<button type="button" class="tp-ordi" data-tp-ordi="${esc(f)}">Ausprobieren</button>` : ''}</div>`).join('')}</div>
      <div class="tp-fuss"><button type="button" data-tp="-1" aria-label="Zurück"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><div class="tp-punkte"></div><button type="button" data-tp="1" aria-label="Weiter"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button><button class="tp-zu" type="button" title="Tipps ausblenden">× Ausblenden</button></div>`;
    const band = el.querySelector('.tp-band'), punkte = el.querySelector('.tp-punkte');
    // Seiten = so viele ganze Karten, wie nebeneinander Platz haben
    const proSeite = () => { const k = band.querySelector('.tp-karte'); return k ? Math.max(1, Math.round((band.clientWidth + 10) / (k.offsetWidth + 10))) : 1; };
    const seiten = () => Math.ceil(l.length / proSeite());
    const jetzt = () => { const k = band.querySelector('.tp-karte'); return k ? Math.round(band.scrollLeft / ((k.offsetWidth + 10) * proSeite())) : 0; };
    const malen = () => {
      const n = seiten(), i = Math.min(jetzt(), n - 1);
      if (punkte.children.length !== n) punkte.innerHTML = n > 1 ? Array.from({ length: n }, (_, j) => `<i data-seite="${j}"></i>`).join('') : '';
      [...punkte.children].forEach((p, j) => p.classList.toggle('an', j === i));
      el.querySelectorAll('[data-tp]').forEach((b) => { b.hidden = n <= 1; b.disabled = (b.dataset.tp === '-1' && i <= 0) || (b.dataset.tp === '1' && i >= n - 1); });
    };
    const gehe = (i) => { const k = band.querySelector('.tp-karte'); if (k) band.scrollTo({ left: Math.max(0, i) * (k.offsetWidth + 10) * proSeite(), behavior: 'smooth' }); };
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
    const rein = () => { if (!ziel.querySelector(':scope > .tp-leiste') && !lies()[hier] && lies().alle !== false) ziel.insertBefore(el, ziel.firstChild); };
    rein();
    // Seiten zeichnen ihren Inhalt neu: die Leiste bleibt oben
    beobachter = new MutationObserver(() => { if (!el.isConnected) rein(); });
    beobachter.observe(ziel, { childList: true });
  }
  window.Tipps = { an: () => { setz({ alle: true }); location.reload(); }, aus: () => { setz({ alle: false }); document.querySelectorAll('.tp-leiste').forEach((e) => e.remove()); }, istAn: () => lies().alle !== false };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(einsetzen, 400)); else setTimeout(einsetzen, 400);
})();
