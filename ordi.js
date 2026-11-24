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
  const vorschlaege = () => VORSCHLAEGE[hier] || ['Was kann Ordasio?', 'Wie schreibe ich eine Rechnung?', 'Zum ersten Mal selbständig'];

  // Ordi selbst: ein freundlicher Ordner mit Gesicht (eigene Zeichnung)
  const GESICHT = (gross = 30) => `<svg viewBox="0 0 64 64" width="${gross}" height="${gross}" aria-hidden="true"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34D399"/><stop offset="1" stop-color="#0E7A55"/></linearGradient></defs>
    <path d="M8 18a6 6 0 0 1 6-6h12l5 5h19a6 6 0 0 1 6 6v25a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="url(#og)"/><path d="M8 24h48" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="25" cy="35" r="3.4" fill="#0A1F17"/><circle cx="39" cy="35" r="3.4" fill="#0A1F17"/><circle cx="26.2" cy="33.8" r="1.1" fill="#fff"/><circle cx="40.2" cy="33.8" r="1.1" fill="#fff"/>
    <path d="M26 43c3.5 3 8.5 3 12 0" stroke="#0A1F17" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="41" r="2.4" fill="#F9A8D4" opacity=".7"/><circle cx="44" cy="41" r="2.4" fill="#F9A8D4" opacity=".7"/></svg>`;

  const css = document.createElement('style');
  css.textContent = `
  .ordi-knopf{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:70;width:58px;height:58px;border-radius:20px;border:0;background:#fff;box-shadow:0 14px 34px -14px rgba(11,59,46,.55),0 1px 2px rgba(0,0,0,.06);display:grid;place-items:center;cursor:pointer;transition:transform .2s}
  .ordi-knopf:hover{transform:translateY(-2px) rotate(-3deg)}
  .ordi-knopf .ordi-blase{position:absolute;right:66px;bottom:8px;background:#0A1F17;color:#fff;font:600 13px/1.3 'League Spartan',system-ui,sans-serif;border-radius:14px 14px 4px 14px;padding:8px 12px;white-space:nowrap;box-shadow:0 10px 24px -12px rgba(0,0,0,.5);animation:ordiRein .4s ease}
  @keyframes ordiRein{from{opacity:0;transform:translateY(6px)}}
  @media(max-width:820px){.ordi-knopf{bottom:calc(84px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:18px}body:has(.fab) .ordi-knopf{bottom:calc(146px + env(safe-area-inset-bottom))}}
  .ordi-panel{position:fixed;right:16px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:71;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 140px));background:#fff;border-radius:22px;box-shadow:0 40px 90px -30px rgba(12,18,38,.55),0 0 0 1px rgba(11,59,46,.08);display:flex;flex-direction:column;overflow:hidden;font:15px/1.45 'League Spartan',system-ui,sans-serif;color:#0A1F17;animation:ordiRein .25s ease}
  @media(max-width:820px){.ordi-panel{left:8px;right:8px;width:auto;bottom:calc(8px + env(safe-area-inset-bottom));height:min(78vh,620px)}}
  .ordi-kopf{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:linear-gradient(135deg,#0A1F17,#0B3B2E);color:#fff}
  .ordi-kopf b{font-size:16px;display:block}.ordi-kopf small{opacity:.75;font-size:12px}
  .ordi-kopf button{margin-left:auto;border:0;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;border-radius:10px;font-size:18px;cursor:pointer}
  .ordi-kopf .ordi-menue{margin-left:auto}.ordi-kopf [data-ordi-zu]{margin-left:6px}
  .ordi-verlauf{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#F7FAF8}
  .ordi-msg{max-width:88%;border-radius:16px;padding:10px 12px;white-space:pre-wrap;word-wrap:break-word}
  .ordi-msg.ordi{background:#fff;border:1px solid rgba(11,59,46,.1);border-bottom-left-radius:4px;align-self:flex-start}
  .ordi-msg.ich{background:#0B3B2E;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  .ordi-msg.fakt{background:linear-gradient(135deg,#FFF8E6,#FDF2D0);border:1px solid #F5D58A}
  .ordi-msg ol{margin:6px 0 0 18px;padding:0}.ordi-msg li{margin:2px 0}
  .ordi-msg a.ordi-hin{display:inline-block;margin-top:8px;font-weight:700;color:#0E7A55;text-decoration:none}
  .ordi-chips{display:flex;gap:6px;flex-wrap:wrap}
  .ordi-chips button{border:1px solid rgba(11,59,46,.18);background:#fff;border-radius:100px;padding:6px 11px;font:inherit;font-size:13px;color:#0B3B2E;cursor:pointer}
  .ordi-eingabe{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(11,59,46,.1);background:#fff}
  .ordi-eingabe input{flex:1;border:1px solid rgba(11,59,46,.22);border-radius:100px;padding:11px 14px;font:inherit;font-size:16px;min-width:0}
  .ordi-eingabe button{border:0;border-radius:100px;background:#0B3B2E;color:#fff;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}
  .ordi-tippt span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#7C8499;margin-right:3px;animation:ordiPunkt 1s infinite}
  .ordi-tippt span:nth-child(2){animation-delay:.15s}.ordi-tippt span:nth-child(3){animation-delay:.3s}
  @keyframes ordiPunkt{50%{opacity:.25;transform:translateY(-2px)}}
  @media print{.ordi-knopf,.ordi-panel{display:none!important}}`;
  document.head.appendChild(css);

  let knopf = null, panel = null;
  const verlauf = lies('ordi.verlauf', []).slice(-20);
  const sichern = () => setz('ordi.verlauf', verlauf.slice(-20));

  function knopfZeigen() {
    if (lies(AUS, false) || knopf) return;
    knopf = document.createElement('button'); knopf.type = 'button'; knopf.className = 'ordi-knopf'; knopf.setAttribute('aria-label', 'Ordi fragen');
    knopf.innerHTML = GESICHT(34);
    knopf.addEventListener('click', () => (panel ? zu() : auf()));
    document.body.appendChild(knopf);
    // Einmal pro Tag kurz Hallo sagen
    const heute = new Date().toLocaleDateString('sv-SE');
    if (lies('ordi.hallo', '') !== heute) {
      setz('ordi.hallo', heute);
      setTimeout(() => { if (!knopf || panel) return; const b = document.createElement('span'); b.className = 'ordi-blase'; b.textContent = 'Fragen? Ich bin Ordi 👋'; knopf.appendChild(b); setTimeout(() => b.remove(), 5000); }, 2500);
    }
  }
  function zu() { if (panel) { panel.remove(); panel = null; } }
  function auf() {
    zu();
    panel = document.createElement('div'); panel.className = 'ordi-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ordi');
    panel.innerHTML = `<div class="ordi-kopf">${GESICHT(36)}<div><b>Ordi</b><small>Ihr Helfer in Ordasio</small></div><button class="ordi-menue" data-ordi-menue title="Optionen">⋯</button><button data-ordi-zu aria-label="Schliessen">×</button></div>
      <div class="ordi-verlauf" id="ordiVerlauf"></div>
      <form class="ordi-eingabe"><input id="ordiFrage" placeholder="Frage stellen …" autocomplete="off" enterkeyhint="send"><button>Senden</button></form>`;
    document.body.appendChild(panel);
    if (!verlauf.length) {
      verlauf.push({ rolle: 'ordi', text: 'Hallo! Ich bin Ordi. Fragen Sie mich alles zu Ordasio, zum Beispiel, wie etwas geht oder wo Sie etwas finden.' });
      verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[0], fakt: true });
    } else if (Math.random() < 0.35) verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[1 + Math.floor(Math.random() * (FUNFACTS.length - 1))], fakt: true });
    malen();
    panel.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = panel.querySelector('#ordiFrage'); const t = f.value.trim(); if (!t) return; f.value = ''; fragen(t); });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-ordi-zu]')) zu();
      const c = e.target.closest('[data-ordi-frage]'); if (c) fragen(c.dataset.ordiFrage);
      if (e.target.closest('[data-ordi-menue]')) menue();
    });
    setTimeout(() => { const f = panel && panel.querySelector('#ordiFrage'); if (f && !matchMedia('(max-width: 820px)').matches) f.focus(); }, 50);
  }
  function menue() {
    verlauf.push({ rolle: 'ordi', text: 'Was möchten Sie?', chips: ['Funfact', 'Verlauf löschen', 'Ordi ausblenden'] });
    malen();
  }
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\n)(\d+)\. /g, '$1<b>$2.</b> ');
  function malen() {
    const v = panel && panel.querySelector('#ordiVerlauf'); if (!v) return;
    v.innerHTML = verlauf.map((m) => `<div class="ordi-msg ${m.rolle} ${m.fakt ? 'fakt' : ''}">${m.html || md(m.text)}${m.ziel ? `<br><a class="ordi-hin" href="${esc(m.ziel)}">Hinführen ›</a>` : ''}</div>${m.chips ? `<div class="ordi-chips">${m.chips.map((c) => `<button data-ordi-frage="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}`).join('')
      + (verlauf.length <= 2 ? `<div class="ordi-chips">${vorschlaege().map((c) => `<button data-ordi-frage="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : '');
    v.scrollTop = v.scrollHeight;
  }
  const S = () => window.NasuviaSuche;
  function lokal(frage) {
    let l = S() ? S().finden(frage) : [];
    // Passend zum Bereich, in dem man gerade ist, zuerst (wenn unter den ersten drei)
    const hierA = l.slice(0, 3).find((a) => a.bereich === BEREICH[hier]);
    if (hierA) l = [hierA, ...l.filter((a) => a !== hierA)];
    if (!l.length) return { text: 'Dazu habe ich in der Anleitung nichts gefunden. Versuchen Sie es mit anderen Worten, oder schreiben Sie an info@nasuvia.ch. Wir helfen gerne.' };
    const a = l[0];
    return { html: `<b>${esc(a.titel)}</b><ol>${a.schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`, text: a.titel, ziel: a.ziel, chips: l.slice(1, 4).map((x) => x.titel) };
  }
  async function token() {
    try { if (window.NASUVIA_SB) { const { data } = await window.NASUVIA_SB.auth.getSession(); if (data.session) return data.session.access_token; } } catch {}
    try { const s = JSON.parse(localStorage.getItem(K.speicher) || 'null'); return (s && s.access_token) || ''; } catch { return ''; }
  }
  let kiAus = false;
  async function mitKi(frage) {
    if (kiAus || !K.produkt || !K.url) return null;
    const t = await token(); if (!t) return null;
    const artikel = (S() ? S().finden(frage) : []).slice(0, 6).map((a) => ({ titel: a.titel, schritte: a.schritte }));
    try {
      const r = await fetch(K.url + '/functions/v1/ordi', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, apikey: K.key },
        body: JSON.stringify({ frage, artikel, bereich: BEREICH[hier] || hier, paket: (window.NASUVIA_LIZENZ || {}).paket || '', verlauf: verlauf.filter((m) => !m.fakt && !m.denkt).slice(-6).map((m) => ({ rolle: m.rolle, text: m.text })) }) });
      if (r.status === 501) { kiAus = true; return null; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.text) return null;
      const a = (S() ? S().finden(frage) : [])[0];
      return { text: j.text, ziel: a && a.ziel };
    } catch { return null; }
  }
  async function fragen(frage) {
    const n = frage.toLowerCase();
    if (n === 'ordi ausblenden') { setz(AUS, true); zu(); if (knopf) { knopf.remove(); knopf = null; } if (window.UI && UI.hinweis) UI.hinweis('Ordi ist ausgeblendet. Unter „Anleitung“ holen Sie ihn jederzeit zurück.'); return; }
    if (n === 'verlauf löschen') { verlauf.length = 0; sichern(); auf(); return; }
    verlauf.push({ rolle: 'ich', text: frage });
    if (/fun ?fact|wusstest|weisst du was|erzähl/.test(n)) { verlauf.push({ rolle: 'ordi', text: '💡 ' + FUNFACTS[Math.floor(Math.random() * FUNFACTS.length)], fakt: true }); sichern(); malen(); return; }
    if (/^(hallo|hoi|hey|grüezi|gruezi|salü|sali|guten (tag|morgen|abend))\b/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Hoi! Wie kann ich helfen?', chips: vorschlaege() }); sichern(); malen(); return; }
    if (/^(danke|merci|super|toll|perfekt)/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Gern geschehen! 😊' }); sichern(); malen(); return; }
    if (/wer bist du|was bist du|wie heisst du/.test(n)) { verlauf.push({ rolle: 'ordi', text: 'Ich bin Ordi, der Helfer in Ordasio. Der Name kommt von «Ordnung». Ich kenne die ganze Anleitung und zeige Ihnen den Weg.' }); sichern(); malen(); return; }
    verlauf.push({ rolle: 'ordi', html: '<span class="ordi-tippt"><span></span><span></span><span></span></span>', text: '', denkt: true }); malen();
    const ki = await mitKi(frage);
    verlauf.pop();
    verlauf.push(ki ? { rolle: 'ordi', text: ki.text, ziel: ki.ziel } : { rolle: 'ordi', ...lokal(frage) });
    sichern(); malen();
  }
  window.Ordi = { auf, zu, an: () => { setz(AUS, false); knopfZeigen(); }, aus: () => { setz(AUS, true); zu(); if (knopf) { knopf.remove(); knopf = null; } }, istAn: () => !lies(AUS, false) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', knopfZeigen); else knopfZeigen();
})();
