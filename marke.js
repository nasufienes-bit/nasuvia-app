// Firma und Design für Rechnungen und Buchhaltung: Logo, Farben und Firmendaten.
// Entweder automatisch von der eigenen Website übernehmen oder selbst hochladen.
// Gespeichert unter „nasuvia.firma.v1“ (die Rechnungs-App gleicht das mit allen Geräten ab).
(() => {
  const KEY = 'nasuvia.firma.v1';
  const K = window.NASUVIA_KONFIG || { url: 'https://dyepnomhidubsfwyorke.supabase.co', key: 'sb_publishable_zEmC1R5vq234zR6ST7PTmA_uY7Z1-ph', speicher: 'nb.anmeldung' };
  const URL_PROJEKT = K.url;
  const SCHLUESSEL = K.key;
  const FELDER = [['name', 'Firmenname'], ['zusatz', 'Zusatz (z. B. Branche)'], ['strasse', 'Strasse und Nr.'], ['ort', 'PLZ und Ort'],
    ['tel', 'Telefon'], ['mail', 'E-Mail'], ['web', 'Website'], ['uid', 'UID / MWST-Nr.']];

  const daten = () => { try { const l = JSON.parse(localStorage.getItem(KEY) || '[]'); return (Array.isArray(l) ? l[0] : l) || {}; } catch { return {}; } };
  const sichern = (d) => { try { localStorage.setItem(KEY, JSON.stringify([{ ...d, geaendert: new Date().toISOString() }])); } catch {} };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Farben aufs ganze Programm legen
  function anwenden() {
    const d = daten(), r = document.documentElement.style;
    if (d.farbe1) r.setProperty('--blau', d.farbe1); else r.removeProperty('--blau');
    if (d.farbe2) r.setProperty('--elektrik', d.farbe2); else r.removeProperty('--elektrik');
    const kopfLogo = document.querySelector('.nv-logo img');
    if (kopfLogo && d.logo) {
      kopfLogo.src = d.logo; kopfLogo.alt = d.name || ''; kopfLogo.style.height = '22px'; kopfLogo.style.display = '';
      const p = kopfLogo.parentElement.querySelector('i'); if (p) p.style.display = 'none';
      const t = kopfLogo.parentElement.querySelector('b'); if (t) t.style.display = 'none';
    } else if (kopfLogo && d.name) { const t = kopfLogo.parentElement.querySelector('b'); if (t) t.textContent = d.name; }
    document.querySelectorAll('.nv-marke').forEach((m) => { if (d.name && m.lastChild && m.lastChild.nodeType === 3) m.lastChild.textContent = d.name; });
  }

  // Bild verkleinern (SVG bleibt, wie es ist)
  const bildLaden = (src) => new Promise((ok, f) => { const i = new Image(); i.onload = () => ok(i); i.onerror = f; i.src = src; });
  async function verkleinern(dataUrl) {
    if (dataUrl.startsWith('data:image/svg')) return dataUrl;
    const img = await bildLaden(dataUrl);
    const f = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * f)); c.height = Math.max(1, Math.round(img.naturalHeight * f));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }
  // Hauptfarben aus dem Logo: kräftige Farben zählen, die häufigsten zuerst
  async function logoFarben(dataUrl) {
    try {
      const img = await bildLaden(dataUrl);
      const c = document.createElement('canvas'); c.width = 80; c.height = Math.max(1, Math.round(80 * img.naturalHeight / img.naturalWidth));
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const px = g.getImageData(0, 0, c.width, c.height).data, zahl = new Map();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        const r = px[i], gr = px[i + 1], b = px[i + 2], max = Math.max(r, gr, b), min = Math.min(r, gr, b);
        if (max - min < 45 || max < 40 || min > 225) continue;
        const k = [r, gr, b].map((x) => Math.round(x / 24) * 24).join(',');
        zahl.set(k, (zahl.get(k) || 0) + 1);
      }
      return [...zahl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([k]) => '#' + k.split(',').map((x) => Math.min(255, +x).toString(16).padStart(2, '0')).join(''));
    } catch { return []; }
  }
  const hell = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000; };
  // Dunklere Farbe als Hauptfarbe (Titel, Flächen), hellere als Akzent
  const paar = (liste) => {
    const l = [...new Set(liste)].filter(Boolean);
    if (!l.length) return null;
    if (l.length === 1) return [l[0], l[0]];
    const [a, b] = l.slice(0, 2).sort((x, y) => hell(x) - hell(y));
    return [a, b];
  };

  const stil = document.createElement('style');
  stil.textContent = `
  .mk-dlg{border:0;border-radius:22px;padding:0;width:min(620px,calc(100% - 20px));max-height:calc(100vh - 30px);box-shadow:0 40px 100px -30px rgba(12,18,38,.5);font-family:inherit;color:#0C1226}
  .mk-dlg::backdrop{background:rgba(12,18,38,.35)}
  .mk-in{padding:22px;overflow:auto;max-height:calc(100vh - 30px)}
  .mk-dlg h3{font-size:1.35rem;margin:0 0 4px}
  .mk-dlg p.mk-sub{color:#47506B;font-size:14px;margin:0 0 14px}
  .mk-box{background:#F2F5FD;border-radius:16px;padding:14px;margin-bottom:14px}
  .mk-box b{display:block;font-size:14px;margin-bottom:8px}
  .mk-zeile{display:flex;gap:8px}
  .mk-zeile input{flex:1}
  .mk-dlg input[type=text],.mk-dlg input[type=url]{width:100%;border:1px solid rgba(28,42,123,.26);border-radius:10px;padding:9px 11px;font:inherit;font-size:15px;background:#fff;color:#0C1226}
  .mk-btn{border:0;border-radius:100px;padding:10px 16px;font:600 14px inherit;font-family:inherit;cursor:pointer;background:#fff;color:#1C2A7B;box-shadow:0 1px 2px rgba(12,18,38,.08),0 6px 16px -10px rgba(28,42,123,.5);white-space:nowrap}
  .mk-btn.haupt{background:var(--mk1,#1C2A7B);color:#fff}
  .mk-btn:disabled{opacity:.5}
  .mk-vorschau{display:flex;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:14px;border:1px solid rgba(28,42,123,.12);margin-bottom:14px;position:relative;overflow:hidden}
  .mk-vorschau::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,var(--mk1,#1C2A7B),var(--mk2,#3B55E6))}
  .mk-vorschau img{max-height:46px;max-width:170px;object-fit:contain}
  .mk-vorschau .mk-leer{width:120px;height:40px;border:2px dashed rgba(28,42,123,.2);border-radius:8px;display:grid;place-items:center;font-size:12px;color:#7C8499}
  .mk-vorschau strong{font-size:22px;color:var(--mk1,#1C2A7B);margin-left:auto}
  .mk-vorschau strong i{color:var(--mk2,#3B55E6);font-style:normal}
  .mk-farben{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
  .mk-farben label{display:flex;gap:8px;align-items:center;font-size:14px}
  .mk-farben input[type=color]{width:42px;height:34px;border:0;padding:0;background:none;cursor:pointer}
  .mk-vorschlaege{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .mk-vorschlaege button{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(28,42,123,.2);cursor:pointer}
  .mk-raster{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mk-raster label{font-size:12.5px;color:#47506B;display:grid;gap:4px}
  .mk-fuss{display:flex;justify-content:space-between;gap:10px;margin-top:16px;flex-wrap:wrap}
  .mk-meldung{font-size:13.5px;min-height:1.2em;margin-top:8px;color:#47506B}
  .mk-meldung.fehler{color:#C53030}
  @media (max-width:560px){.mk-raster{grid-template-columns:1fr}.mk-zeile{flex-direction:column}}`;
  document.head.appendChild(stil);

  function dialog({ beiSpeichern } = {}) {
    const d = { ...daten() };
    let vorschlaege = [];
    const dlg = document.createElement('dialog');
    dlg.className = 'mk-dlg';
    const zeichnen = () => {
      dlg.style.setProperty('--mk1', d.farbe1 || '#1C2A7B'); dlg.style.setProperty('--mk2', d.farbe2 || '#3B55E6');
      dlg.innerHTML = `<div class="mk-in">
        <h3>Firma und Design</h3>
        <p class="mk-sub">Ihr Logo, Ihre Farben und Ihre Angaben erscheinen auf Rechnungen, Offerten und im ganzen Programm.</p>
        <div class="mk-vorschau">${d.logo ? `<img src="${d.logo}" alt="Logo">` : '<span class="mk-leer">Ihr Logo</span>'}<strong>Rechnung<i>.</i></strong></div>
        <div class="mk-box"><b>Automatisch von Ihrer Website</b>
          <div class="mk-zeile"><input type="url" data-mk="website" placeholder="z. B. www.ihre-firma.ch" value="${esc(d.webScan || d.web || '')}"><button class="mk-btn haupt" data-mk-scan>Übernehmen</button></div>
          <p class="mk-meldung" data-mk-meldung>Logo, Name und Farben werden von Ihrer Website gelesen. Sie können danach alles anpassen.</p></div>
        <div class="mk-box"><b>Oder selbst festlegen</b>
          <div class="mk-zeile" style="margin-bottom:12px"><button class="mk-btn" data-mk-logo>Logo hochladen</button>${d.logo ? '<button class="mk-btn" data-mk-logoweg>Logo entfernen</button>' : ''}</div>
          <div class="mk-farben"><label><input type="color" data-mk-farbe="farbe1" value="${d.farbe1 || '#1C2A7B'}">Hauptfarbe</label><label><input type="color" data-mk-farbe="farbe2" value="${d.farbe2 || '#3B55E6'}">Akzentfarbe</label></div>
          ${vorschlaege.length ? `<div class="mk-vorschlaege" title="Farben aus Ihrem Logo und Ihrer Website">${vorschlaege.map((f) => `<button style="background:${f}" data-mk-vorschlag="${f}" aria-label="Farbe ${f}"></button>`).join('')}</div>` : ''}</div>
        <div class="mk-raster">${FELDER.map(([k, n]) => `<label>${n}<input type="text" data-mk="${k}" value="${esc(d[k] || '')}"></label>`).join('')}</div>
        <div class="mk-fuss"><button class="mk-btn" data-mk-standard>Standard-Design</button><span style="display:flex;gap:8px"><button class="mk-btn" data-mk-zu>Abbrechen</button><button class="mk-btn haupt" data-mk-ok>Speichern</button></span></div>
      </div>`;
    };
    const meldung = (t, fehler) => { const m = dlg.querySelector('[data-mk-meldung]'); m.textContent = t; m.classList.toggle('fehler', !!fehler); };
    const felderLesen = () => dlg.querySelectorAll('[data-mk]').forEach((i) => { if (i.dataset.mk === 'website') d.webScan = i.value.trim(); else d[i.dataset.mk] = i.value.trim(); });
    dlg.addEventListener('input', (e) => {
      const f = e.target.dataset.mkFarbe;
      if (f) { d[f] = e.target.value; dlg.style.setProperty(f === 'farbe1' ? '--mk1' : '--mk2', e.target.value); }
    });
    dlg.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) { if (e.target === dlg) dlg.close(); return; }
      e.preventDefault();
      if (t.matches('[data-mk-zu]')) dlg.close();
      if (t.matches('[data-mk-vorschlag]')) {
        felderLesen();
        const f = t.dataset.mkVorschlag;
        if (hell(f) < 150) d.farbe1 = f; else d.farbe2 = f;
        zeichnen();
      }
      if (t.matches('[data-mk-logoweg]')) { felderLesen(); d.logo = ''; zeichnen(); }
      if (t.matches('[data-mk-standard]')) { felderLesen(); delete d.farbe1; delete d.farbe2; zeichnen(); }
      if (t.matches('[data-mk-logo]')) {
        felderLesen();
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
        inp.onchange = async () => {
          const datei = inp.files[0]; if (!datei) return;
          const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(datei); });
          d.logo = await verkleinern(url);
          vorschlaege = await logoFarben(d.logo);
          const p = paar(vorschlaege); if (p && !d.farbe1) [d.farbe1, d.farbe2] = p;
          zeichnen();
        };
        inp.click();
      }
      if (t.matches('[data-mk-scan]')) {
        felderLesen();
        if (!d.webScan) { meldung('Bitte zuerst Ihre Website-Adresse eingeben.', true); return; }
        t.disabled = true; meldung('Ihre Website wird gelesen …');
        try {
          if (!window.supabase) throw new Error('Keine Verbindung zum Dienst.');
          const sb = window.supabase.createClient(URL_PROJEKT, SCHLUESSEL, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } });
          const { data, error } = await sb.functions.invoke('marke-scannen', { body: { url: d.webScan } });
          if (error) { let txt = error.message; try { txt = (await error.context.json()).fehler || txt; } catch {} throw new Error(txt); }
          if (data.fehler) throw new Error(data.fehler);
          if (data.logo) d.logo = await verkleinern(data.logo);
          if (data.name && !d.name) d.name = data.name;
          if (!d.web) d.web = data.website;
          const ausLogo = data.logo && !data.logoIstSymbol ? await logoFarben(d.logo) : [];
          vorschlaege = [...new Set([...ausLogo, ...(data.farben || [])])].slice(0, 8);
          const p = paar([...(data.farben || []).slice(0, 2), ...ausLogo]);
          if (p) [d.farbe1, d.farbe2] = p;
          zeichnen();
          meldung(`Übernommen von ${data.website}${data.logo ? '' : ' (kein Logo gefunden, bitte selbst hochladen)'}. Prüfen und speichern.`);
        } catch (f) {
          zeichnen(); meldung(f.message || 'Die Website konnte nicht gelesen werden.', true);
        }
      }
      if (t.matches('[data-mk-ok]')) {
        felderLesen(); sichern(d); anwenden(); dlg.close();
        if (beiSpeichern) beiSpeichern(daten());
      }
    });
    dlg.addEventListener('close', () => dlg.remove());
    zeichnen();
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  window.Marke = { daten, anwenden, dialog };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', anwenden); else anwenden();
  setTimeout(anwenden, 400);
  // Änderungen von anderen Geräten oder Tabs übernehmen
  window.addEventListener('storage', (e) => { if (e.key === KEY) anwenden(); });
})();
