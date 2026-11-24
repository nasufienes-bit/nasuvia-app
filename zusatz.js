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
      <small>Könnte interessant für Sie sein</small><button class="zp-zu" data-zusatz-weg="${m.id}" aria-label="Ausblenden">×</button>
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
    if (!liste.length) return;
    // Abwechseln: jeden Tag ein anderes Paket, passende zuerst
    const sortiert = o.vorschlaege(l, { branche, mitarbeiter: ma }).filter((m) => liste.includes(m));
    const reihe = sortiert.length ? sortiert : liste;
    const m = reihe[Math.floor(jetzt / 864e5) % Math.min(reihe.length, 3)];
    const grund = l.status === 'test' ? `Im Gratis-Test ist ${m.name} offen. ${m.erklaerung.split('. ')[0]}.` : '';
    ziel.innerHTML = karte(m.id, { grund });
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
    if (b.dataset.zusatzWeg) { const w = lies('ordasio.zusatzWeg', {}); w[b.dataset.zusatzWeg] = Date.now(); schreib('ordasio.zusatzWeg', w); const k = b.closest('.zp-karte'); if (k) k.remove(); return; }
    if (b.dataset.zusatzInfo) { erklaeren(b.dataset.zusatzInfo); return; }
    buchen(b.dataset.zusatzBuchen);
  });

  window.OrdasioZusatz = { karte, empfehlung, erklaeren, buchen };
})();
