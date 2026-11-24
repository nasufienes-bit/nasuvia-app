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
      ['🔄', 'Bewegungen', 'Eingang, Ausgang oder Korrektur. Material lässt sich einem Auftrag zuordnen.']],
    vorlagen: [['🖨️', 'Drucken oder PDF', 'Vorlage wählen, links ausfüllen, rechts sehen Sie das fertige Blatt.'],
      ['📁', 'In die Ablage', 'Als PDF direkt beim richtigen Ordner und Mitarbeiter ablegen.']],
    start: [['👋', 'Willkommen', 'Hier sehen Sie, was als Nächstes zu tun ist. Erledigtes verschwindet.'],
      ['🧭', 'Menü', 'Oben links finden Sie alle Bereiche, Erinnerungen und die Darstellung.'],
      ['💬', 'Ordi', 'Unten rechts beantwortet Ordi Ihre Fragen und zeigt den Weg.']],
  };
  const ZIEL = { rechnungen: 'aside.panel' };
  const css = document.createElement('style');
  css.textContent = `.tp-leiste{position:relative;margin:0 0 16px;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--elektrik,#0E7A55) 9%,transparent),rgba(201,164,92,.12));padding:12px 40px 12px 12px;font-family:inherit}
  .tp-band{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tp-band::-webkit-scrollbar{display:none}
  .tp-karte{flex:0 0 min(320px,86%);scroll-snap-align:start;background:rgba(255,255,255,.85);border-radius:14px;padding:10px 12px;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:start}
  .tp-karte span{font-size:22px;grid-row:span 2;line-height:1.2}.tp-karte b{font-size:14.5px;color:#0A1F17}.tp-karte p{font-size:13px;color:#3F5A4F;margin:0;line-height:1.4}
  .tp-zu{position:absolute;top:8px;right:8px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(255,255,255,.8);color:#3F5A4F;font-size:16px;cursor:pointer}
  .tp-punkte{display:flex;gap:5px;justify-content:center;margin-top:8px}.tp-punkte i{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb,var(--blau,#0B3B2E) 20%,transparent)}.tp-punkte i.an{background:var(--elektrik,#0E7A55);width:16px;border-radius:4px}
  @media print{.tp-leiste{display:none}}`;
  document.head.appendChild(css);
  function bauen() {
    const l = TIPPS[hier]; if (!l) return null;
    const d = lies(); if (d.alle === false || d[hier]) return null;
    const el = document.createElement('div'); el.className = 'tp-leiste'; el.setAttribute('aria-label', 'Tipps');
    el.innerHTML = `<div class="tp-band">${l.map(([ic, t, x]) => `<div class="tp-karte"><span>${ic}</span><b>${esc(t)}</b><p>${esc(x)}</p></div>`).join('')}</div>
      ${l.length > 1 ? `<div class="tp-punkte">${l.map((_, i) => `<i class="${i ? '' : 'an'}"></i>`).join('')}</div>` : ''}<button class="tp-zu" type="button" aria-label="Tipps ausblenden" title="Tipps ausblenden">×</button>`;
    const band = el.querySelector('.tp-band');
    band.addEventListener('scroll', () => { const k = band.querySelector('.tp-karte'); if (!k) return; const i = Math.round(band.scrollLeft / (k.offsetWidth + 10)); el.querySelectorAll('.tp-punkte i').forEach((p, j) => p.classList.toggle('an', j === i)); }, { passive: true });
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
