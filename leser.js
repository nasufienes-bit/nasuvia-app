// Dokumente automatisch lesen: Quittungen, Rechnungen, Mahnungen, Betreibungen.
// 1. KI (Supabase-Funktion dokument-lesen), 2. sonst Texterkennung im Browser (Tesseract),
// danach immer ein Fenster zum Prüfen: nichts wird ohne Bestätigung übernommen.
(() => {
  const K = window.NASUVIA_KONFIG || {};
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const alsDataUrl = (blob) => new Promise((ok, f) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = f; r.readAsDataURL(blob); });
  async function alsBlob(x) { if (x instanceof Blob) return x; if (typeof x === 'string' && x.startsWith('data:')) return (await fetch(x)).blob(); return null; }

  // Fotos für die KI verkleinern (lange Seite max. 1800 px, JPEG)
  async function vorbereiten(blob) {
    if (!blob.type.startsWith('image/')) return { mime: blob.type || (/\.pdf$/i.test(blob.name || '') ? 'application/pdf' : ''), daten: await alsDataUrl(blob) };
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((ok, f) => { const i = new Image(); i.onload = () => ok(i); i.onerror = f; i.src = url; });
      const f = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { mime: 'image/jpeg', daten: c.toDataURL('image/jpeg', 0.85) };
    } finally { URL.revokeObjectURL(url); }
  }

  async function token() {
    try { if (window.NASUVIA_SB) { const { data } = await window.NASUVIA_SB.auth.getSession(); if (data.session) return data.session.access_token; } } catch {}
    try { const s = JSON.parse(localStorage.getItem(K.speicher) || 'null'); return (s && (s.access_token || (s.currentSession || {}).access_token)) || ''; } catch { return ''; }
  }

  async function mitKi(blob, art, extra) {
    if (!K.produkt || !K.url) return null; // Die KI läuft im Ordasio-Projekt
    const t = await token(); if (!t) return null;
    const v = await vorbereiten(blob);
    if (v.daten.length > 7e6) return null;
    const r = await fetch(K.url + '/functions/v1/dokument-lesen', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, apikey: K.key },
      body: JSON.stringify({ art, mime: v.mime, daten: v.daten, ...extra }),
    }).catch(() => null);
    if (!r) return null;
    const j = await r.json().catch(() => ({}));
    if (r.status === 501) return null; // KI nicht eingerichtet
    if (!r.ok) return { fehler: j.fehler || 'Das Lesen hat nicht geklappt.' };
    return j;
  }

  /* ---------- Ersatz: Texterkennung im Browser ---------- */
  let tess;
  async function text(blob) {
    if (!tess) tess = new Promise((ok, f) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = () => ok(window.Tesseract); s.onerror = f; document.head.appendChild(s); });
    const T = await tess; const { data } = await T.recognize(blob, 'deu'); return data.text || '';
  }
  const zahl = (x) => Number(String(x).replace(/[’'\s]/g, '').replace(',', '.'));
  const datumIso = (t) => { const m = t.match(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d{2}|\d{2})\b/); if (!m) return ''; const j = m[3].length === 2 ? '20' + m[3] : m[3]; return `${j}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
  function belegAusText(t) {
    const zeilen = t.split(/\n/).map((z) => z.trim()).filter(Boolean);
    const betraege = [...t.matchAll(/(\d{1,3}(?:[’' ]\d{3})*[.,]\d{2})/g)].map((m) => zahl(m[1])).filter((x) => x > 0 && x < 1e6);
    const total = (t.match(/(?:total|summe|zu bezahlen|betrag)[^\n\d]{0,20}(\d{1,3}(?:[’' ]\d{3})*[.,]\d{2})/i) || [])[1];
    const satz = (t.match(/\b(8[.,]1|2[.,]6|3[.,]8|7[.,]7|2[.,]5|3[.,]7)\s?%/) || [])[1];
    const satzN = satz ? zahl(satz) : null;
    return { lieferant: (zeilen[0] || '').slice(0, 60), datum: datumIso(t), betrag: total ? zahl(total) : (betraege.length ? Math.max(...betraege) : null),
      mwst_satz: satzN == null ? null : ({ 7.7: 8.1, 2.5: 2.6, 3.7: 3.8 }[satzN] || satzN), unsicher: ['lieferant', 'betrag', 'datum', 'mwst_satz'] };
  }
  async function mitTexterkennung(blob, art) {
    if (!blob.type.startsWith('image/')) return { fehler: 'PDFs werden nur mit der KI gelesen. Bitte die Angaben selbst eintragen.' };
    const t = await text(blob);
    if (art === 'rechnung' && window.HomeBuero && window.HomeBuero.rechnungAusText) {
      const g = window.HomeBuero.rechnungAusText(t);
      return { felder: { absender: g.absender || '', betrag: g.betrag ? g.betrag / 100 : null, faellig: g.faellig || '', mahnstufe: g.mahnstufe || 0, gebuehr: g.gebuehr ? g.gebuehr / 100 : null, unsicher: ['absender', 'betrag', 'faellig'] }, quelle: 'text' };
    }
    if (art === 'betreibung' && window.HomeBuero && window.HomeBuero.betreibungAusText) {
      const g = window.HomeBuero.betreibungAusText(t);
      return { felder: { glaeubiger: g.glaeubiger, betrag: g.betrag ? g.betrag / 100 : null, nummer: g.nummer, amt: g.amt, art: g.verlustschein ? 'verlustschein' : 'zahlungsbefehl', unsicher: ['glaeubiger', 'betrag'] }, quelle: 'text' };
    }
    return { felder: belegAusText(t), quelle: 'text' };
  }

  // Lesen: zuerst KI, sonst Texterkennung. Gibt { felder, quelle } oder { fehler }.
  async function lesen(datei, art = 'beleg', extra = {}) {
    const blob = await alsBlob(datei); if (!blob) return { fehler: 'Keine Datei.' };
    let r = null;
    try { r = await mitKi(blob, art, extra); } catch { r = null; }
    if (r && r.felder) { if (r.felder.lesbar === false) return { fehler: 'Das Dokument ist nicht lesbar. Bitte ein schärferes Foto machen oder die Angaben selbst eintragen.' }; return r; }
    if (r && r.fehler && !/nicht_eingerichtet/.test(r.fehler)) { const t = await mitTexterkennung(blob, art).catch(() => null); return t && t.felder ? { ...t, hinweis: r.fehler } : r; }
    try { return await mitTexterkennung(blob, art); } catch { return { fehler: 'Das Lesen hat nicht geklappt. Bitte die Angaben selbst eintragen.' }; }
  }

  /* ---------- Fenster zum Prüfen ---------- */
  // felder: [{ id, label, typ: 'text'|'betrag'|'datum'|'select'|'zahl', optionen: [[wert, text]] }]
  function pruefen({ titel = 'Stimmt das?', bild = null, felder = [], werte = {}, unsicher = [], quelle = 'ki', hinweis = '' }) {
    return new Promise((fertig) => {
      const dlg = document.createElement('dialog'); dlg.className = 'ui-frage leser-dlg';
      const bildUrl = bild instanceof Blob ? URL.createObjectURL(bild) : (typeof bild === 'string' ? bild : '');
      const istBild = bild instanceof Blob ? bild.type.startsWith('image/') : /^data:image|^blob:|\.(jpe?g|png|webp)$/i.test(bildUrl);
      const feld = (f) => {
        const w = werte[f.id] ?? '', u = unsicher.includes(f.id) || unsicher.includes(f.quelle || '');
        const attr = `data-leser="${f.id}" class="${u ? 'leser-unsicher' : ''}"`;
        const eingabe = f.typ === 'select'
          ? `<select ${attr}>${f.optionen.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(w) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`
          : `<input ${attr} type="${f.typ === 'datum' ? 'date' : 'text'}" ${['betrag', 'zahl'].includes(f.typ) ? 'inputmode="decimal"' : ''} value="${esc(f.typ === 'betrag' && w !== '' && w != null ? Number(w).toFixed(2) : w)}">`;
        return `<label class="leser-feld"><span>${esc(f.label)}${u ? ' <em>bitte prüfen</em>' : ''}</span>${eingabe}</label>`;
      };
      dlg.innerHTML = `<form method="dialog"><h3>${esc(titel)}</h3>
        <p>${quelle === 'ki' ? '✨ Automatisch gelesen.' : 'Mit Texterkennung gelesen.'} Bitte kurz prüfen und bei Bedarf korrigieren. Erst mit „Übernehmen“ wird etwas eingetragen.${hinweis ? '<br><small>' + esc(hinweis) + '</small>' : ''}</p>
        <div class="leser-raster ${bildUrl ? '' : 'ohne'}">${bildUrl ? `<div class="leser-bild">${istBild ? `<img src="${bildUrl}" alt="Dokument">` : `<iframe src="${bildUrl}" title="Dokument"></iframe>`}</div>` : ''}
          <div class="leser-felder">${felder.map(feld).join('')}</div></div>
        <div class="ui-knoepfe"><button type="button" class="nein" data-leser-nein>Nicht übernehmen</button><button class="ja">Übernehmen</button></div></form>`;
      document.body.appendChild(dlg);
      const ende = (wert) => { if (bild instanceof Blob) URL.revokeObjectURL(bildUrl); dlg.close(); dlg.remove(); fertig(wert); };
      dlg.querySelector('[data-leser-nein]').onclick = () => ende(null);
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); ende(null); });
      dlg.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const aus = {};
        for (const f of felder) {
          const el = dlg.querySelector(`[data-leser="${f.id}"]`); let v = el.value.trim();
          if (['betrag', 'zahl'].includes(f.typ)) v = v === '' ? null : zahl(v);
          aus[f.id] = v;
        }
        ende(aus);
      };
      dlg.addEventListener('input', (e) => e.target.classList && e.target.classList.remove('leser-unsicher'));
      dlg.showModal();
    });
  }

  // Lesen mit Ladeanzeige, dann prüfen lassen. Gibt die bestätigten Werte zurück oder null.
  // Im öffentlichen Demo-Konto keine echten Unterlagen hochladen: alle Besucher sehen dieselben Daten
  async function demoOk() {
    if (!window.NASUVIA_DEMO || !window.UI || !UI.frage) return true;
    return UI.frage('Sie sind im Demo-Konto. Alles, was Sie hier hochladen, sehen alle, die sich mit dem Demo-Login anmelden. Bitte nur Beispieldaten verwenden, für echte Daten ein eigenes Konto erstellen.\n\nTrotzdem fortfahren?');
  }
  async function lesenUndPruefen(datei, art, { felder, titel, werteAus = (f) => f, extra = {} } = {}) {
    if (!await demoOk()) return null;
    const lade = document.createElement('div'); lade.className = 'leser-lade'; lade.innerHTML = '<span></span>Dokument wird gelesen …';
    document.body.appendChild(lade);
    let r; try { r = await lesen(datei, art, extra); } finally { lade.remove(); }
    if (!r || r.fehler) { if (window.UI) await UI.hinweis(r ? r.fehler : 'Das Lesen hat nicht geklappt.'); return null; }
    const f = r.felder || {};
    return pruefen({ titel, bild: await alsBlob(datei), felder, werte: werteAus(f), unsicher: f.unsicher || [], quelle: r.quelle, hinweis: r.hinweis });
  }

  const css = document.createElement('style');
  css.textContent = `.leser-dlg{width:min(860px,calc(100vw - 20px))!important;max-width:none!important}
  .leser-raster{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;margin:10px 0}
  .leser-bild{background:#F1F5F3;border-radius:12px;overflow:hidden;max-height:60vh}
  .leser-bild img{display:block;width:100%;height:auto;max-height:60vh;object-fit:contain}
  .leser-bild iframe{width:100%;height:60vh;border:0}
  .leser-felder{display:grid;gap:8px}
  .leser-raster.ohne{grid-template-columns:1fr}.leser-raster.ohne .leser-felder{grid-template-columns:1fr 1fr}
  .leser-feld{display:grid;gap:3px;font-size:13px;color:#3F5A4F}
  .leser-feld em{font-style:normal;color:#B7791F;font-weight:600;font-size:12px}
  .leser-feld input,.leser-feld select{font:inherit;font-size:16px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);border-radius:10px;padding:9px 11px;background:#fff;color:#0A1F17;width:100%}
  .leser-feld .leser-unsicher{border-color:#F5B53D;background:#FFFBEB}
  .leser-lade{position:fixed;inset:auto 0 24px;margin:0 auto;width:max-content;max-width:90vw;z-index:2147483000;background:var(--blau,#0B3B2E);color:#fff;border-radius:100px;padding:12px 18px;display:flex;gap:10px;align-items:center;box-shadow:0 18px 40px -16px rgba(0,0,0,.5);font-weight:600}
  .leser-lade span{width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;animation:leserDreh 0.8s linear infinite}
  @keyframes leserDreh{to{transform:rotate(360deg)}}
  @media(max-width:640px){.leser-raster,.leser-raster.ohne .leser-felder{grid-template-columns:1fr}.leser-bild,.leser-bild img{max-height:28vh}.leser-bild iframe{height:28vh}}`;
  document.head.appendChild(css);

  window.Leser = { lesen, pruefen, lesenUndPruefen, ki: (blob, art) => mitKi(blob, art) };
})();
