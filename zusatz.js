/* Ordasio – Zusatzpakete anbieten und per Knopfdruck buchen.
   Einbinden nach pakete.js, ui.js und lizenz.js: <script src="zusatz.js"></script>
   - OrdasioZusatz.karte(modulId, { gross })  → HTML-Karte „Könnte interessant für Sie sein“
   - OrdasioZusatz.empfehlung(ziel)           → zeigt in ziel (Element) eine passende Empfehlung (höchstens eine, wegklickbar)
   - OrdasioZusatz.erklaeren(modulId)         → Dialog: was das Paket kann, wie es funktioniert, Preis, Buchen
   - Knöpfe mit data-zusatz-buchen="id" oder data-zusatz-info="id" funktionieren überall
*/
(function () {
  'use strict';
  const O = () => window.ORDASIO;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lizenz = () => { if (window.NASUVIA_LIZENZ) return window.NASUVIA_LIZENZ; try { return JSON.parse(localStorage.getItem('ordasio.lizenz') || 'null'); } catch { return null; } };
  const lies = (k, v) => { try { const x = JSON.parse(localStorage.getItem(k)); return x == null ? v : x; } catch { return v; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const wurzel = (() => { const s = document.currentScript; try { return new URL('.', s.src).href; } catch { return '/'; } })();

  const stil = document.createElement('style');
  stil.textContent = `
  .zp-karte{position:relative;display:flex;flex-direction:column;gap:6px;padding:20px 22px 18px;border-radius:20px;margin:0 0 16px;min-width:0;
    background:var(--karte,#fff);border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);box-shadow:0 1px 2px rgba(12,18,38,.04),0 14px 30px -22px rgba(12,18,38,.35)}
  .zp-kopf{display:flex;align-items:center;gap:12px;margin-bottom:4px}
  .zp-ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;font-size:22px;color:var(--elektrik,#0E7A55);background:color-mix(in srgb,var(--elektrik,#0E7A55) 11%,transparent)}
  .zp-ic svg{width:22px;height:22px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.zp-ic .oi{width:22px;height:22px;vertical-align:0}
  .zp-marke{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--elektrik,#0E7A55);background:color-mix(in srgb,var(--elektrik,#0E7A55) 9%,transparent);padding:5px 10px;border-radius:100px}
  .zp-marke::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
  .zp-titel{display:block;font-size:17px;line-height:1.3;font-weight:700;color:var(--tinte,#0A1F17);letter-spacing:-.005em}
  .zp-unter{display:block;font-size:14px;line-height:1.45;color:var(--elektrik,#0E7A55);font-weight:600}
  .zp-karte p{margin:2px 0 6px;font-size:14px;line-height:1.55;color:var(--text,#3F5A4F)}
  .zp-knoepfe{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:auto;padding-top:6px}
  .zp-knoepfe button{display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1.2;border:0;border-radius:100px;padding:10px 18px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;background:var(--blau,#0B3B2E);color:#fff}
  .zp-knoepfe button.zweit{background:transparent;color:var(--blau,#0B3B2E);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent)}
  .zp-knoepfe button:hover{filter:brightness(1.08)}
  .zp-preis{margin-left:auto;font-size:13px;font-weight:600;color:var(--leise,#7C8499);white-space:nowrap}
  .zp-zu{margin-left:auto;flex:none;width:32px;height:32px;border:0;border-radius:50%;background:transparent;cursor:pointer;color:var(--leise,#7C8499);display:grid;place-items:center;padding:0}
  .zp-zu:hover{background:color-mix(in srgb,var(--blau,#0B3B2E) 7%,transparent);color:var(--tinte,#0A1F17)}
  .zp-dlg h3{margin:0 0 4px}.zp-dlg .zp-gross{font-size:38px;line-height:1}.zp-dlg ul{margin:10px 0;padding-left:20px;line-height:1.6;font-size:14.5px}
  .zp-dlg .zp-wie{background:var(--flaeche,#E8F4EE);border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55;margin:10px 0}
  .zp-dlg .zp-preis{font-size:15px;margin:8px 0 0;display:block;color:inherit;font-weight:400}
  @media (max-width:560px){
    .zp-karte{align-items:center;text-align:center;padding:22px 20px 20px}
    .zp-kopf{flex-direction:column;gap:10px;margin-bottom:2px}
    .zp-zu{position:absolute;top:10px;right:10px}
    .zp-knoepfe{flex-direction:column;align-items:stretch;width:100%}
    .zp-knoepfe button{width:100%;padding:12px 18px}
    .zp-preis{margin:2px auto 0}}`;
  document.head.appendChild(stil);

  function karte(id, { grund = '' } = {}) {
    const m = O() && O().modul(id); if (!m) return '';
    return `<div class="zp-karte" data-zp-karte="${m.id}">
      <div class="zp-kopf"><span class="zp-ic">${m.icon}</span><span class="zp-marke">Könnte interessant für Sie sein</span><button class="zp-zu" data-zusatz-weg="${m.id}" aria-label="Ausblenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <b class="zp-titel">${esc(m.name)}</b><span class="zp-unter">${esc(m.kurz)}</span>
      <p>${esc(grund || m.erklaerung.split('. ')[0] + '.')}</p>
      <div class="zp-knoepfe"><button data-zusatz-info="${m.id}">So funktioniert es</button><button class="zweit" data-zusatz-buchen="${m.id}">Dazubuchen</button><span class="zp-preis">CHF ${m.monat} / Monat</span></div></div>`;
  }

  // Eine passende Empfehlung zeigen. Weggeklickte Pakete erscheinen 14 Tage nicht mehr.
  function empfehlung(ziel) {
    const l = lizenz(), o = O();
    if (!ziel || !l || !o || !o.vorschlaege || window.NASUVIA_DEMO) return;
    if (lies('ordasio.tipps', true) === false && lies('ordasio.empfehlungenAus', false)) return;
    const weg = lies('ordasio.zusatzWeg', {}), jetzt = Date.now();
    let branche = l.branche || ''; try { branche = branche || (window.Branchen && window.Branchen.aktuell()) || ''; } catch {}
    const ma = (lies('ordasio.mitarbeiterAnzahl', 0)) || 0;
    // Im Gratis-Test sind alle Pakete offen: dann das zeigen, was nach dem Test fehlen würde
    const liste = (l.status === 'test' ? o.MODULE.filter((m) => o.kannBuchen(l, m.id) && !o.gebucht(l).includes(m.id)) : o.vorschlaege(l, { branche, mitarbeiter: ma }))
      .filter((m) => !(weg[m.id] && jetzt - weg[m.id] < 14 * 864e5));
    // Abwechseln: jeden Tag eine andere Reihenfolge, passende zuerst
    const sortiert = o.vorschlaege(l, { branche, mitarbeiter: ma }).filter((m) => liste.includes(m));
    const reihe = sortiert.length ? sortiert : liste, start = reihe.length ? Math.floor(jetzt / 864e5) % reihe.length : 0;
    band(ziel, reihe.map((x, j) => reihe[(j + start) % reihe.length]));
  }

  /* ---------- Ideen-Band: mehrere Vorschläge zum Wischen ---------- */
  const IDEEN = [
    { p: 'rechnungen', t: 'Rechnung in einem Satz', x: 'Sagen Sie Ordi, was Sie verrechnen. Er füllt die Rechnung aus, Sie prüfen und senden.', f: 'Rechnung an Müller über 3 Stunden à 95' },
    { p: 'buchhaltung', t: 'Buchen ohne Tippen', x: 'Ordi öffnet das Buchungsfenster schon ausgefüllt, mit Kategorie und MWST.', f: 'Buche 45.20 Migros als Material' },
    { p: 'zeit', t: 'Team in einem Satz', x: 'Mitarbeiter erfassen, Auftrag erstellen und zuteilen, alles in einem Schritt.', f: 'Füge Mitarbeiter Tom Keller hinzu und teile ihm den Auftrag Garten Huber zu' },
    { p: 'zeit', t: 'Ferien bewilligen', x: 'Offene Anträge erledigen, ohne die Liste zu suchen.', f: 'Genehmige die Ferien von Sara' },
    { p: 'lager', t: 'Material auf den Auftrag', x: 'Verbrauch buchen und der Bestand stimmt sofort.', f: '6 Meter Kupferrohr auf Badsanierung Müller' },
    { p: 'termine', t: 'Termin eintragen', x: 'Ordi trägt den Termin ein, Ihr Online-Kalender ist sofort aktuell.', f: 'Termin mit Frau Keller am Freitag um 14 Uhr' },
    { p: 'rechnungen', t: 'Mahnen mit einem Satz', x: 'Ordi zeigt, welche Rechnungen überfällig sind, und bereitet die Erinnerungen vor.', f: 'Mahne die überfälligen Rechnungen' },
    { p: '', t: 'Ihre Zahlen fragen', x: 'Umsatz, Ausgaben oder Gewinn eines Monats, sofort beantwortet.', f: 'Wie viel Umsatz hatte ich im Oktober?' },
    { p: '', t: 'Briefing nach Wunsch', x: 'Ihre wichtigsten Punkte, wann Sie wollen.', f: 'Briefing jeden Montag um 7' },
    { p: '', t: 'Nie mehr etwas vergessen', x: 'Erinnerungen mit Datum und Zeit, auch im Handy-Kalender.', f: 'Erinnere mich morgen um 9 an die MWST' },
  ];
  const IC_ORDI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h.01M15 11h.01M9.5 14.5c1.4 1 3.6 1 5 0"/></svg>';
  const PFEIL = (r) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${r ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}"/></svg>`;
  stil.textContent += `
  .zp-band-wrap{margin:28px auto 22px;max-width:980px}
  .zp-band{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;padding:4px 2px 8px}
  .zp-band::-webkit-scrollbar{display:none}
  @media (min-width:760px){.zp-band{grid-auto-columns:calc((100% - 14px) / 2)}}
  .zp-band > .zp-karte{margin:0;scroll-snap-align:start}
  .zp-idee .zp-ic{color:#4F46E5;background:color-mix(in srgb,#4F46E5 10%,transparent)}
  .zp-idee .zp-marke{color:#4F46E5;background:color-mix(in srgb,#4F46E5 8%,transparent)}
  .zp-zitat{display:block;margin:10px 0 2px;padding:10px 14px;border-radius:14px 14px 14px 4px;background:color-mix(in srgb,#4F46E5 7%,transparent);font-size:14px;font-style:italic;color:#2b2f4a;text-align:left}
  .zp-zu svg,.zp-nav svg{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .zp-fuss{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:10px}
  .zp-nav{width:34px;height:34px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;background:var(--karte,#fff);color:var(--blau,#0B3B2E);cursor:pointer;box-shadow:0 0 0 1px color-mix(in srgb,var(--blau,#0B3B2E) 12%,transparent)}
  .zp-nav:disabled{opacity:.35;cursor:default}
  .zp-punkte{display:flex;gap:6px;align-items:center}.zp-punkte i{width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,var(--blau,#0B3B2E) 20%,transparent);transition:width .2s}.zp-punkte i.an{width:20px;border-radius:4px;background:var(--blau,#0B3B2E)}
  @media (max-width:560px){.zp-band-wrap{margin:24px 0 18px}.zp-zitat{text-align:center;border-radius:14px}}`;
  function ideeKarte(i) {
    return `<div class="zp-karte zp-idee" data-zp-idee="${i.f.replace(/"/g, '')}">
      <div class="zp-kopf"><span class="zp-ic">${IC_ORDI}</span><span class="zp-marke">Mit Ordi ganz einfach</span><button class="zp-zu" data-zp-idee-weg aria-label="Ausblenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <b class="zp-titel">${esc(i.t)}</b><p>${esc(i.x)}<span class="zp-zitat">«${esc(i.f)}»</span></p>
      <div class="zp-knoepfe"><button data-zp-ordi="${esc(i.f)}">Ausprobieren</button></div></div>`;
  }
  // Band mit mehreren Vorschlägen: passende Zusatzpakete und Ideen mit Ordi (nur für eigene Bereiche)
  function band(ziel, pakete) {
    const l = lizenz(), o = O(), weg = lies('ordasio.ideeWeg', {}), tag = Math.floor(Date.now() / 864e5);
    const darf = (p) => !p || !o || !l || o.darf(l, p);
    let ideen = IDEEN.filter((i) => darf(i.p) && !weg[i.f]);
    ideen = ideen.map((x, j) => ideen[(j + tag) % ideen.length]).slice(0, 4);
    const karten = [];
    pakete.slice(0, 3).forEach((m, j) => { karten.push(karte(m.id, { grund: l && l.status === 'test' ? `Im Gratis-Test ist ${m.name} offen. ${m.erklaerung.split('. ')[0]}.` : '' })); if (ideen[j]) karten.push(ideeKarte(ideen[j])); });
    ideen.slice(pakete.length).forEach((i) => karten.push(ideeKarte(i)));
    if (!karten.length) { ziel.innerHTML = ''; return; }
    ziel.innerHTML = `<div class="zp-band-wrap"><div class="zp-band">${karten.join('')}</div><div class="zp-fuss"><button class="zp-nav" data-zp-nav="-1" aria-label="Zurück">${PFEIL(0)}</button><span class="zp-punkte"></span><button class="zp-nav" data-zp-nav="1" aria-label="Weiter">${PFEIL(1)}</button></div></div>`;
    const b = ziel.querySelector('.zp-band'), pk = ziel.querySelector('.zp-punkte');
    const breite = () => { const k = b.firstElementChild; return k ? k.offsetWidth + 14 : 1; };
    const pro = () => Math.max(1, Math.round((b.clientWidth + 14) / breite()));
    const seiten = () => Math.max(1, Math.ceil(b.children.length / pro()));
    const jetzt = () => Math.round(b.scrollLeft / (breite() * pro()));
    const malen = () => { const n = seiten(), i = Math.min(jetzt(), n - 1);
      if (pk.children.length !== n) pk.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
      [...pk.children].forEach((x, j) => x.classList.toggle('an', j === i));
      ziel.querySelector('.zp-fuss').hidden = n <= 1;
      ziel.querySelectorAll('[data-zp-nav]').forEach((x) => { x.disabled = (x.dataset.zpNav === '-1' && i <= 0) || (x.dataset.zpNav === '1' && i >= n - 1); }); };
    b.addEventListener('scroll', malen, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(malen).observe(b);
    ziel.onclick = (e) => {
      const n = e.target.closest('[data-zp-nav]'); if (n) { b.scrollTo({ left: (jetzt() + Number(n.dataset.zpNav)) * breite() * pro(), behavior: 'smooth' }); return; }
      const t = e.target.closest('[data-zp-ordi]'); if (t) { if (window.Ordi && Ordi.vorschlag) Ordi.vorschlag(t.dataset.zpOrdi); else if (window.UI) UI.hinweis('Öffnen Sie Ordi oben rechts und schreiben Sie: «' + t.dataset.zpOrdi + '»'); return; }
      const w = e.target.closest('[data-zp-idee-weg]'); if (w) { const k = w.closest('[data-zp-idee]'), v = lies('ordasio.ideeWeg', {}); v[k.dataset.zpIdee] = Date.now(); schreib('ordasio.ideeWeg', v); k.remove(); malen(); if (!b.children.length) ziel.innerHTML = ''; }
    };
    setTimeout(malen, 30);
  }

  function erklaeren(id) {
    const m = O() && O().modul(id); if (!m || !window.UI) return;
    const l = lizenz() || {}, o = O();
    const hat = o.gebucht(l).includes(m.id), kann = o.kannBuchen(l, m.id);
    const pr = o.preis({ paket: l.paket || 'solo', module: [...new Set([...o.gebucht(l), m.id])], zyklus: 'monat' });
    const html = `<div class="zp-dlg"><div class="zp-gross">${m.icon}</div><h3>${esc(m.name)}</h3><p style="margin:0;color:#5b6862">${esc(m.kurz)}</p>
      <div class="zp-wie"><b>So funktioniert es:</b> ${esc(m.erklaerung)}</div>
      <ul>${m.was.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      <p class="zp-preis"><b>CHF ${m.monat} pro Monat</b> oder CHF ${m.jahr} pro Jahr${pr && pr.prozent ? `. Mit Ihren Zusatzpaketen gilt ${pr.prozent} % Kombi-Rabatt.` : '. Ab 2 Zusatzpaketen 10 % Kombi-Rabatt, ab 3 Paketen 25 %.'}</p>
      ${!kann && l.paket ? `<p class="zp-preis">${m.braucht === 'buchhaltung' ? 'Dieses Paket gibt es zu „Selbständig“ oder „Business“.' : 'Dieses Paket gibt es zu den Firmenlizenzen.'}</p>` : ''}</div>`;
    if (!l.paket) { UI.hinweis(html.replace(/<p class="zp-preis">Dieses Paket gibt es[^<]*<\/p>/, ''), { html: true, ja: 'Verstanden' }); return; }
    if (hat || l.status === 'test') { UI.hinweis(html + (hat ? '<p>✓ Bereits gebucht.</p>' : '<p>Im Gratis-Test ist es bereits offen. Probieren Sie es aus!</p>'), { html: true }); return; }
    if (!kann) { UI.frage(html, { html: true, ja: 'Lizenzen ansehen', gefahr: false }).then((ja) => { if (ja) location.href = wurzel + 'lizenz/'; }); return; }
    UI.frage(html, { html: true, ja: 'Jetzt dazubuchen', nein: 'Später', gefahr: false }).then((ja) => { if (ja) buchen(m.id, true); });
  }

  async function buchen(id, schonGefragt) {
    const m = O() && O().modul(id), sb = window.NASUVIA_SB, l = lizenz() || {};
    if (!m) return;
    if (window.NASUVIA_DEMO) { await UI.hinweis('Im Demo-Konto lassen sich keine Pakete buchen. Starten Sie den Gratis-Test, dort ist alles offen.'); return; }
    if (!sb) { location.href = wurzel + 'lizenz/#zusatzpakete'; return; }
    if (!schonGefragt && !await UI.frage(`„${m.name}“ für CHF ${m.monat} pro Monat dazubuchen? ${l.status === 'aktiv' ? 'Es ist sofort offen, der Betrag kommt auf Ihre nächste Rechnung.' : ''} Abbestellen geht jederzeit unter Lizenz und Konto.`, { ja: 'Dazubuchen', gefahr: false })) return;
    const { data, error } = await sb.rpc('zusatz_buchen', { p_id: m.id, p_an: true });
    if (error) { await UI.hinweis(error.message); return; }
    if (window.NASUVIA_LIZENZ) window.NASUVIA_LIZENZ.zusatz = data;
    try { const x = JSON.parse(localStorage.getItem('ordasio.lizenz') || '{}'); x.zusatz = data; localStorage.setItem('ordasio.lizenz', JSON.stringify(x)); } catch {}
    await UI.hinweis(`✓ ${m.name} ist gebucht und sofort offen.`);
    location.reload();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-zusatz-buchen],[data-zusatz-info],[data-zusatz-weg]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.zusatzWeg) { const w = lies('ordasio.zusatzWeg', {}); w[b.dataset.zusatzWeg] = Date.now(); schreib('ordasio.zusatzWeg', w); const k = b.closest('.zp-karte'); if (k) { const bd = k.parentElement; k.remove(); if (bd) bd.dispatchEvent(new Event('scroll')); } return; }
    if (b.dataset.zusatzInfo) { erklaeren(b.dataset.zusatzInfo); return; }
    buchen(b.dataset.zusatzBuchen);
  });

  window.OrdasioZusatz = { karte, empfehlung, erklaeren, buchen };
})();
