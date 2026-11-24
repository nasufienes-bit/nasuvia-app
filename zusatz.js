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
  .zp-karte{position:relative;display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:start;padding:16px 18px;border-radius:18px;margin:0 0 16px;
    background:linear-gradient(135deg,color-mix(in srgb,var(--elektrik,#1F9D6B) 12%,#fff),#fff 70%);border:1px solid color-mix(in srgb,var(--elektrik,#1F9D6B) 30%,transparent);box-shadow:0 6px 22px -14px rgba(0,0,0,.35)}
  .zp-ic{grid-row:span 3;display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:#fff;font-size:26px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .zp-karte small{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--elektrik,#1F9D6B);padding-right:28px}
  .zp-karte b{font-size:16.5px;line-height:1.3;color:var(--blau,#0B3B2E)}
  .zp-karte p{margin:2px 0 8px;font-size:14px;line-height:1.5;color:#3d4a44}
  .zp-knoepfe{grid-column:2;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .zp-knoepfe button{border:0;border-radius:100px;padding:9px 16px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;background:var(--blau,#0B3B2E);color:#fff}
  .zp-knoepfe button.zweit{background:#fff;color:var(--blau,#0B3B2E);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--blau,#0B3B2E) 30%,transparent)}
  .zp-knoepfe span{font-size:13px;color:#5b6862}
  .zp-zu{position:absolute;top:10px;right:10px;width:30px;height:30px;border:0;border-radius:50%;background:transparent;font-size:18px;line-height:30px;cursor:pointer;color:#6b7771}
  .zp-zu:hover{background:rgba(0,0,0,.06)}
  .zp-dlg h3{margin:0 0 4px}.zp-dlg .zp-gross{font-size:38px;line-height:1}.zp-dlg ul{margin:10px 0;padding-left:20px;line-height:1.6;font-size:14.5px}
  .zp-dlg .zp-wie{background:var(--flaeche,#E8F4EE);border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55;margin:10px 0}
  .zp-dlg .zp-preis{font-size:15px;margin:8px 0 0}
  @media (max-width:560px){.zp-karte{grid-template-columns:1fr;padding:14px}.zp-ic{grid-row:auto;width:42px;height:42px;font-size:22px}.zp-knoepfe{grid-column:1}}`;
  document.head.appendChild(stil);

  function karte(id, { grund = '' } = {}) {
    const m = O() && O().modul(id); if (!m) return '';
    return `<div class="zp-karte" data-zp-karte="${m.id}"><span class="zp-ic">${m.icon}</span>
      <small>Könnte interessant für Sie sein</small><button class="zp-zu" data-zusatz-weg="${m.id}" aria-label="Ausblenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <b>${esc(m.name)}: ${esc(m.kurz)}</b>
      <p>${esc(grund || m.erklaerung.split('. ')[0] + '.')}</p>
      <div class="zp-knoepfe"><button data-zusatz-info="${m.id}">So funktioniert es</button><button class="zweit" data-zusatz-buchen="${m.id}">Dazubuchen</button><span>CHF ${m.monat} / Monat</span></div></div>`;
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
  .zp-band-wrap{margin:0 0 18px}
  .zp-band{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;padding:2px 0 4px}
  .zp-band::-webkit-scrollbar{display:none}
  @media (min-width:760px){.zp-band{grid-auto-columns:calc((100% - 12px) / 2)}}
  .zp-band > .zp-karte{margin:0;scroll-snap-align:start;min-width:0;align-content:start}
  .zp-karte.zp-idee{background:linear-gradient(135deg,color-mix(in srgb,#4F46E5 9%,#fff),#fff 70%);border-color:color-mix(in srgb,#4F46E5 24%,transparent)}
  .zp-karte.zp-idee small{color:#4F46E5}
  .zp-ic svg{width:24px;height:24px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .zp-ic .oi{width:24px;height:24px;vertical-align:0}
  .zp-idee .zp-ic{color:#4F46E5}
  .zp-zitat{display:block;margin:2px 0 10px;padding:8px 12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,#4F46E5 18%,transparent);font-size:14px;color:#2b2f4a}
  .zp-knoepfe button{display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1.2}
  .zp-zu{display:grid;place-items:center;padding:0;line-height:1}
  .zp-zu svg,.zp-nav svg{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .zp-fuss{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px}
  .zp-nav{width:30px;height:30px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E);cursor:pointer}
  .zp-nav:disabled{opacity:.35;cursor:default}
  .zp-punkte{display:flex;gap:6px;align-items:center}.zp-punkte i{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);transition:width .2s}.zp-punkte i.an{width:18px;border-radius:4px;background:var(--blau,#0B3B2E)}`;
  function ideeKarte(i) {
    return `<div class="zp-karte zp-idee" data-zp-idee="${i.f.replace(/"/g, '')}"><span class="zp-ic">${IC_ORDI}</span>
      <small>Mit Ordi ganz einfach</small><button class="zp-zu" data-zp-idee-weg aria-label="Ausblenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <b>${esc(i.t)}</b><p>${esc(i.x)}<span class="zp-zitat">«${esc(i.f)}»</span></p>
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
    const breite = () => { const k = b.firstElementChild; return k ? k.offsetWidth + 12 : 1; };
    const pro = () => Math.max(1, Math.round((b.clientWidth + 12) / breite()));
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
