// Firmenablage: eigene Ordner (Personal, Marketing, Verträge …), Dokumente pro Mitarbeiter,
// Mitteilungen ans Team und Anträge (Ferien, Absenzen) der Mitarbeitenden.
(() => {
  'use strict';
  const K = window.NASUVIA_KONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const toast = (t, ms = 2800) => { const e = $('toast'); e.textContent = t; e.classList.add('da'); clearTimeout(toast.z); toast.z = setTimeout(() => e.classList.remove('da'), ms); };
  const fehlerText = (e) => String((e && e.message) || e || 'Unbekannter Fehler');
  const groesse = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');
  const tageBis = (d) => Math.round((new Date(d + 'T12:00') - new Date(heute() + 'T12:00')) / 864e5);

  const ICON = {
    ablage: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    personal: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 5"/>',
    mitteilungen: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    antraege: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 15l2.5 2.5L16 12"/>',
    bewerbungen: '<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 11-5.7M17 14v6M14 17h6"/>',
  };
  const TABS = [['ablage', 'Ordner'], ['personal', 'Personal'], ['mitteilungen', 'Mitteilungen'], ['antraege', 'Anträge'], ['bewerbungen', 'Bewerbungen']];
  const FARBEN = ['#0E7A55', '#0B3B2E', '#2563EB', '#7C3AED', '#DB2777', '#E0703A', '#C9A45C', '#0891B2', '#64748B'];
  const SYMBOLE = ['📁', '👤', '📄', '📝', '🎓', '⬆️', '✉️', '🏖️', '📣', '🛡️', '🚗', '🧾', '🏷️', '📦', '⚖️', '💼', '🔑', '📸'];
  // Vorschläge: der Kunde benennt seine Ordner selbst, das sind nur Ideen
  const IDEEN = [['Arbeitsverträge', '📝', '#0B3B2E'], ['Arbeitszeugnisse', '🎓', '#2563EB'], ['Kündigungen', '✉️', '#64748B'], ['Beförderungen und Lohn', '⬆️', '#0E7A55'],
    ['Lohnausweise', '🧾', '#C9A45C'], ['Ferien und Absenzen', '🏖️', '#0891B2'], ['Arztzeugnisse', '🩺', '#DB2777'], ['Marketing', '📣', '#E0703A'], ['Versicherungen', '🛡️', '#7C3AED'],
    ['Verträge und Offerten', '⚖️', '#0B3B2E'], ['Fahrzeuge', '🚗', '#64748B'], ['Zertifikate und Schulungen', '🏷️', '#0E7A55']];
  const ANTRAG = { ferien: 'Ferien', frei: 'Frei / Kompensation', krank: 'Krankheit', unfall: 'Unfall', weiterbildung: 'Weiterbildung', anderes: 'Anderes' };
  const STATUS = { offen: ['Offen', 'm-offen'], bewilligt: ['Bewilligt', 'm-ok'], abgelehnt: ['Abgelehnt', 'm-grau'], zurueckgezogen: ['Zurückgezogen', 'm-grau'] };

  const Z = { tab: 'ablage', ordner: [], dateien: [], mitarbeiter: [], mitteilungen: [], antraege: [], stellen: [], bewerbungen: [], bwFilter: 'aktiv', bwOffen: null, offen: null, person: null, suche: '', bereit: false };
  const q = new URLSearchParams(location.search);
  if (TABS.some(([id]) => id === q.get('tab'))) Z.tab = q.get('tab');
  if (!K.produkt) { $('inhalt').innerHTML = '<div class="start"><h2>Firmenablage</h2><p>Die Firmenablage gibt es in der Verkaufsversion (Ordasio).</p></div>'; return; }
  const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } });
  let uid = null;
  const ordner = (id) => Z.ordner.find((o) => o.id === id);
  const ma = (id) => Z.mitarbeiter.find((m) => m.id === id);
  const inOrdner = (id) => Z.dateien.filter((d) => d.ordner_id === id);

  async function laden() {
    Korb.neuLaden = laden;
    Korb.aufraeumen(sb, [{ tabelle: 'ab_dateien', dateien: async (l) => { await sb.storage.from('ablage').remove(l.map((d) => d.pfad)); } }, { tabelle: 'ab_ordner' }]);
    try {
      uid = (await sb.auth.getUser()).data.user.id;
      const [o, d, m, n, a] = await Promise.all([
        sb.from('ab_ordner').select('*').is('geloescht_am', null).order('sortierung').order('name'),
        sb.from('ab_dateien').select('*').is('geloescht_am', null).order('erstellt', { ascending: false }).limit(3000),
        sb.from('ze_mitarbeiter').select('id,name,aktiv,token').is('geloescht_am', null).order('aktiv', { ascending: false }).order('name'),
        sb.from('ab_mitteilungen').select('*').is('geloescht_am', null).order('erstellt', { ascending: false }).limit(100),
        sb.from('ab_antraege').select('*').order('erstellt', { ascending: false }).limit(300),
      ]);
      for (const r of [o, d, m, n, a]) if (r.error) throw r.error;
      Z.ordner = o.data; Z.dateien = d.data; Z.mitarbeiter = m.data; Z.mitteilungen = n.data; Z.antraege = a.data;
      const [st, bw] = await Promise.all([sb.from('bw_stellen').select('*').is('geloescht_am', null).order('erstellt', { ascending: false }), sb.from('bw_bewerbungen').select('*').is('geloescht_am', null).order('erstellt', { ascending: false }).limit(500)]);
      Z.stellen = st.data || []; Z.bewerbungen = bw.data || [];
      Z.bereit = true; zeichnen();
    } catch (e) { $('inhalt').innerHTML = `<div class="card"><h2>Daten konnten nicht geladen werden</h2><p class="hinweis">${esc(fehlerText(e))}</p></div>`; }
  }

  function zeichnen() {
    const offen = Z.antraege.filter((a) => a.status === 'offen').length;
    const neueBw = Z.bewerbungen.filter((b) => b.status === 'neu').length;
    const name = (id, n) => n + (id === 'antraege' && offen ? ` (${offen})` : '') + (id === 'bewerbungen' && neueBw ? ` (${neueBw})` : '');
    $('tabs').innerHTML = TABS.map(([id, n]) => `<button class="${Z.tab === id ? 'an' : ''}" data-tab="${id}">${name(id, n)}</button>`).join('');
    $('untenNav').innerHTML = TABS.map(([id, n]) => `<button class="${Z.tab === id ? 'an' : ''}" data-tab="${id}"><svg viewBox="0 0 24 24">${ICON[id]}</svg>${name(id, n)}</button>`).join('');
    if (!Z.bereit) return;
    $('inhalt').innerHTML = ({ ablage: ablageAnsicht, personal: personalAnsicht, mitteilungen: mitteilungenAnsicht, antraege: antraegeAnsicht, bewerbungen: bewerbungenAnsicht })[Z.tab]();
  }

  /* ---------- Ordner ---------- */
  const dateiTyp = (d) => { const n = (d.name || '').toLowerCase(), t = d.typ || '';
    if (t.includes('pdf') || n.endsWith('.pdf')) return ['PDF', '#E5484D']; if (t.startsWith('image/')) return ['BILD', '#7C3AED'];
    if (/\.(docx?|odt|pages)$/.test(n)) return ['DOC', '#2563EB']; if (/\.(xlsx?|csv|numbers|ods)$/.test(n)) return ['XLS', '#0E9F6E']; return ['DATEI', '#64748B']; };
  const dateiZeile = (d, mitPerson = true) => { const [k, f] = dateiTyp(d), m = d.mitarbeiter_id && ma(d.mitarbeiter_id), o = ordner(d.ordner_id);
    const ablauf = d.ablauf ? tageBis(d.ablauf) : null;
    return `<div class="zeile datei klick" data-datei="${d.id}"><span class="datei-ic" style="background:${f}">${k}</span><div style="min-width:0"><b>${esc(d.name)}</b>
      <small>${esc([dk(d.erstellt.slice(0, 10)), d.groesse ? groesse(d.groesse) : '', mitPerson && m ? '👤 ' + m.name : '', !mitPerson && o ? o.symbol + ' ' + o.name : '', d.fuer_mitarbeiter ? (d.gelesen_am ? '✓ vom Mitarbeiter geöffnet' : 'für Mitarbeiter sichtbar') : ''].filter(Boolean).join(' · '))}</small>
      ${ablauf != null ? `<small style="color:${ablauf < 0 ? 'var(--rot)' : ablauf <= 30 ? '#8a5a00' : 'var(--leise)'}">${ablauf < 0 ? 'Abgelaufen am ' : 'Gültig bis '}${dk(d.ablauf)}</small>` : ''}</div>
      <button class="btn klein" data-datei-mehr="${d.id}" aria-label="Mehr">•••</button></div>`; };

  function ablageAnsicht() {
    if (Z.offen && ordner(Z.offen)) return ordnerAnsicht(ordner(Z.offen));
    const s = Z.suche.toLowerCase(), treffer = s ? Z.dateien.filter((d) => `${d.name} ${d.notiz || ''} ${(ma(d.mitarbeiter_id) || {}).name || ''}`.toLowerCase().includes(s)) : [];
    const bald = Z.dateien.filter((d) => d.ablauf && tageBis(d.ablauf) <= 30);
    const ohne = inOrdner(null);
    const vorhanden = new Set(Z.ordner.map((o) => o.name.toLowerCase()));
    const ideen = IDEEN.filter(([n]) => !vorhanden.has(n.toLowerCase()));
    return `<div class="kopf"><div><h1>Firmenablage</h1><p class="unter">Alles an einem Ort: Personal, Verträge, Marketing. Die Ordner benennen Sie selbst.</p></div>
        <div class="aktionen"><button class="btn" data-a="korb">Zuletzt gelöscht</button><a class="btn" href="../vorlagen/">Vorlagen</a><button class="btn" data-a="ordnerNeu">+ Ordner</button><button class="btn haupt" data-a="hoch">Dateien hochladen</button></div></div>
      ${!Z.ordner.length ? `<div class="tipp-karte"><span style="font-size:26px">💡</span><span><b>Tipp:</b> Viele Firmen haben Arbeitszeugnisse, Kündigungen und Verträge verstreut in E-Mails und Schubladen. Legen Sie hier Ordner an, zum Beispiel einen pro Thema, und laden Sie Dateien direkt vom Computer oder Handy hoch. Dokumente für einen Mitarbeiter können Sie ihm auf seinem Handy-Link zeigen.</span></div>` : ''}
      <div class="filter"><input type="search" data-suche placeholder="In allen Dateien suchen" value="${esc(Z.suche)}" style="flex:1;min-width:220px"></div>
      ${s ? `<div class="card">${treffer.map((d) => dateiZeile(d)).join('') || '<p class="leer">Nichts gefunden</p>'}</div>` : `
      ${bald.length ? `<div class="card" style="margin-bottom:14px;border:1px solid rgba(245,181,61,.5)"><h2>Läuft bald ab</h2>${bald.map((d) => dateiZeile(d)).join('')}</div>` : ''}
      <div class="ordner-raster">${Z.ordner.filter((o) => !o.eltern_id).map((o) => { const n = inOrdner(o.id).length;
        return `<button class="ordner" data-ordner="${o.id}"><span class="sym" style="background:${o.farbe}1f;color:${o.farbe}">${esc(o.symbol)}</span><b>${esc(o.name)}</b><small>${n} ${n === 1 ? 'Datei' : 'Dateien'}</small></button>`; }).join('')}
        <button class="ordner neu" data-a="ordnerNeu"><span style="font-size:26px">＋</span><small>Neuer Ordner</small></button></div>
      ${ideen.length ? `<div class="abstand"><p class="hinweis" style="margin-bottom:8px">Ideen für Ordner (antippen zum Anlegen):</p><div class="ideen">${ideen.map(([n, sy, f]) => `<button data-idee="${esc(n)}" data-sym="${sy}" data-farbe="${f}">${sy} ${esc(n)}</button>`).join('')}</div></div>` : ''}
      ${ohne.length ? `<div class="card abstand"><h2>Ohne Ordner</h2>${ohne.map((d) => dateiZeile(d)).join('')}</div>` : ''}`}`;
  }
  function ordnerAnsicht(o) {
    const l = inOrdner(o.id);
    return `<p class="hinweis" style="margin-bottom:8px"><a href="#" data-zurueck>← Alle Ordner</a></p>
      <div class="kopf"><div style="display:flex;gap:12px;align-items:center"><span class="sym" style="width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-size:25px;background:${o.farbe}1f">${esc(o.symbol)}</span><div><h1>${esc(o.name)}</h1><p class="unter">${l.length} ${l.length === 1 ? 'Datei' : 'Dateien'}</p></div></div>
        <div class="aktionen"><button class="btn" data-ordner-bearb="${o.id}">Bearbeiten</button><button class="btn haupt" data-a="hoch">Hochladen</button></div></div>
      <label class="ablage-drop" id="drop"><b>Dateien hierher ziehen</b> oder antippen zum Auswählen<br><small>PDF, Fotos, Word, Excel bis 25 MB</small><input type="file" multiple hidden data-hoch-ordner="${o.id}"></label>
      <div class="card abstand">${l.map((d) => dateiZeile(d)).join('') || '<p class="leer">Noch leer.</p>'}</div>`;
  }
  function ordnerDialog(o = null, vorschlag = {}) {
    const d = $('dlg'); const w = { name: '', farbe: FARBEN[0], symbol: '📁', ...vorschlag, ...(o || {}) };
    const malen = () => {
      d.innerHTML = `<form class="dlg" id="fOrdner"><h3>${o ? 'Ordner bearbeiten' : 'Neuer Ordner'}</h3>
        <label>Name<input type="text" name="name" value="${esc(w.name)}" maxlength="80" required placeholder="z. B. Arbeitszeugnisse"></label>
        <label>Farbe<div class="farben">${FARBEN.map((f) => `<button type="button" data-farbe-w="${f}" class="${w.farbe === f ? 'an' : ''}" style="background:${f}" aria-label="Farbe"></button>`).join('')}</div></label>
        <label>Symbol<div class="symbole">${SYMBOLE.map((s) => `<button type="button" data-sym-w="${s}" class="${w.symbol === s ? 'an' : ''}">${s}</button>`).join('')}</div></label>
        <div class="fuss">${o ? '<button type="button" class="btn rot" data-ordner-weg>Löschen</button>' : '<span></span>'}<span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt">Speichern</button></span></div></form>`;
    };
    malen();
    d.onclick = async (e) => {
      if (e.target.closest('[data-zu]')) { d.close(); return; }
      const f = e.target.closest('[data-farbe-w]'), s = e.target.closest('[data-sym-w]');
      if (f || s) { w.name = d.querySelector('[name=name]').value; if (f) w.farbe = f.dataset.farbeW; if (s) w.symbol = s.dataset.symW; malen(); return; }
      if (e.target.closest('[data-ordner-weg]')) {
        const n = inOrdner(o.id).length;
        if (n && !await UI.frage(`Im Ordner liegen ${n} Dateien. Sie landen danach unter „Ohne Ordner“.`)) return;
        if (!await Korb.loeschen(sb, 'ab_ordner', o.id, o.name)) return;
        if (n) await sb.from('ab_dateien').update({ ordner_id: null }).eq('ordner_id', o.id);
        d.close(); Z.offen = null; laden();
      }
    };
    d.querySelector('form').onsubmit = null;
    d.onsubmit = async (e) => {
      e.preventDefault(); w.name = d.querySelector('[name=name]').value.trim(); if (!w.name) return;
      const werte = { name: w.name, farbe: w.farbe, symbol: w.symbol };
      const r = o ? await sb.from('ab_ordner').update(werte).eq('id', o.id) : await sb.from('ab_ordner').insert({ ...werte, sortierung: Z.ordner.length });
      if (r.error) { toast(fehlerText(r.error)); return; }
      d.close(); await laden(); toast(o ? 'Gespeichert' : `Ordner „${w.name}“ angelegt`);
    };
    d.showModal();
  }

  /* ---------- Hochladen ---------- */
  function hochladenDialog(vorgabe = {}) {
    const d = $('dlg');
    d.innerHTML = `<form class="dlg" id="fHoch"><h3>Dateien hochladen</h3>
      <label class="ablage-drop" id="drop2"><b>Dateien auswählen</b> oder hierher ziehen<br><small id="dateiWahl">PDF, Fotos, Word, Excel bis 25 MB</small><input type="file" name="dateien" multiple hidden></label>
      <div class="zwei"><label>Ordner<select name="ordner"><option value="">Ohne Ordner</option>${Z.ordner.map((o) => `<option value="${o.id}" ${o.id === (vorgabe.ordner || Z.offen) ? 'selected' : ''}>${esc(o.symbol + ' ' + o.name)}</option>`).join('')}</select></label>
        <label>Mitarbeiter <small>(freiwillig)</small><select name="ma"><option value="">Niemand</option>${Z.mitarbeiter.map((m) => `<option value="${m.id}" ${m.id === vorgabe.ma ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label></div>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tinte)"><input type="checkbox" name="sichtbar" style="width:18px;height:18px"> Der Mitarbeiter darf die Datei auf seinem Handy-Link sehen</label>
      <div class="zwei"><label>Gültig bis <small>(freiwillig, z. B. Bewilligung)</small><input type="date" name="ablauf"></label><label>Notiz <small>(freiwillig)</small><input type="text" name="notiz" maxlength="300"></label></div>
      <div class="fuss"><span></span><span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt" id="hochKnopf">Hochladen</button></span></div></form>`;
    const input = d.querySelector('[name=dateien]'); let gewaehlt = vorgabe.dateien ? [...vorgabe.dateien] : [];
    const anzeigen = () => { $('dateiWahl').textContent = gewaehlt.length ? gewaehlt.map((f) => f.name).join(', ') : 'PDF, Fotos, Word, Excel bis 25 MB'; };
    input.onchange = () => { gewaehlt = [...input.files]; anzeigen(); };
    dropZone($('drop2'), (l) => { gewaehlt = l; anzeigen(); });
    anzeigen();
    d.onclick = (e) => { if (e.target.closest('[data-zu]')) d.close(); };
    d.onsubmit = async (e) => {
      e.preventDefault();
      if (!gewaehlt.length) { toast('Bitte zuerst Dateien auswählen'); return; }
      const f = Object.fromEntries(new FormData(d.querySelector('form')));
      $('hochKnopf').disabled = true;
      const n = await hochladen(gewaehlt, { ordner_id: f.ordner || null, mitarbeiter_id: f.ma || null, fuer_mitarbeiter: !!f.sichtbar && !!f.ma, ablauf: f.ablauf || null, notiz: f.notiz || null });
      d.close(); await laden(); if (n) toast(`✓ ${n} ${n === 1 ? 'Datei' : 'Dateien'} gespeichert`);
    };
    d.showModal();
  }
  async function hochladen(dateien, werte) {
    let ok = 0;
    for (const datei of dateien) {
      if (datei.size > 25 * 1024 * 1024) { toast(`${datei.name} ist grösser als 25 MB`, 4000); continue; }
      toast(`Wird hochgeladen … ${ok + 1} von ${dateien.length}`, 60000);
      const id = crypto.randomUUID(), endung = (datei.name.match(/\.[a-z0-9]{1,6}$/i) || [''])[0].toLowerCase();
      const pfad = `${uid}/${id}${endung}`;
      const { error: e1 } = await sb.storage.from('ablage').upload(pfad, datei, { contentType: datei.type || 'application/octet-stream' });
      if (e1) { toast(fehlerText(e1), 4000); continue; }
      const { error: e2 } = await sb.from('ab_dateien').insert({ id, name: datei.name.slice(0, 200), pfad, typ: datei.type || null, groesse: datei.size, ...werte });
      if (e2) { await sb.storage.from('ablage').remove([pfad]); toast(fehlerText(e2), 4000); continue; }
      ok++;
    }
    return ok;
  }
  function dropZone(el, fertig) {
    if (!el) return;
    ['dragenter', 'dragover'].forEach((t) => el.addEventListener(t, (e) => { e.preventDefault(); el.classList.add('ueber'); }));
    ['dragleave', 'drop'].forEach((t) => el.addEventListener(t, () => el.classList.remove('ueber')));
    el.addEventListener('drop', (e) => { e.preventDefault(); fertig([...e.dataTransfer.files]); });
  }
  async function oeffnen(d) {
    const fenster = window.open('', '_blank');
    const { data, error } = await sb.storage.from('ablage').createSignedUrl(d.pfad, 300);
    if (error || !data) { if (fenster) fenster.close(); toast('Datei nicht gefunden'); return; }
    if (fenster) fenster.location = data.signedUrl; else location.href = data.signedUrl;
  }
  function dateiDialog(datei) {
    const d = $('dlg');
    d.innerHTML = `<form class="dlg"><h3>${esc(datei.name)}</h3>
      <label>Name<input type="text" name="name" value="${esc(datei.name)}" maxlength="200" required></label>
      <div class="zwei"><label>Ordner<select name="ordner"><option value="">Ohne Ordner</option>${Z.ordner.map((o) => `<option value="${o.id}" ${o.id === datei.ordner_id ? 'selected' : ''}>${esc(o.symbol + ' ' + o.name)}</option>`).join('')}</select></label>
        <label>Mitarbeiter<select name="ma"><option value="">Niemand</option>${Z.mitarbeiter.map((m) => `<option value="${m.id}" ${m.id === datei.mitarbeiter_id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label></div>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tinte)"><input type="checkbox" name="sichtbar" ${datei.fuer_mitarbeiter ? 'checked' : ''} style="width:18px;height:18px"> Für den Mitarbeiter auf seinem Handy-Link sichtbar</label>
      <div class="zwei"><label>Gültig bis<input type="date" name="ablauf" value="${datei.ablauf || ''}"></label><label>Notiz<input type="text" name="notiz" value="${esc(datei.notiz || '')}" maxlength="300"></label></div>
      <div class="fuss"><button type="button" class="btn rot" data-weg>Löschen</button><span class="aktionen"><button type="button" class="btn" data-oeffnen>Öffnen</button><button class="btn haupt">Speichern</button></span></div></form>`;
    d.onclick = async (e) => {
      if (e.target.closest('[data-oeffnen]')) oeffnen(datei);
      if (e.target.closest('[data-weg]')) { if (await Korb.loeschen(sb, 'ab_dateien', datei.id, datei.name)) { d.close(); laden(); } }
    };
    d.onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(d.querySelector('form')));
      const { error } = await sb.from('ab_dateien').update({ name: f.name.trim(), ordner_id: f.ordner || null, mitarbeiter_id: f.ma || null, fuer_mitarbeiter: !!f.sichtbar && !!f.ma, ablauf: f.ablauf || null, notiz: f.notiz || null }).eq('id', datei.id);
      if (error) { toast(fehlerText(error)); return; }
      d.close(); laden(); toast('Gespeichert');
    };
    d.showModal();
  }

  /* ---------- Personal ---------- */
  function personalAnsicht() {
    if (!Z.mitarbeiter.length) return `<div class="start"><div class="gross"><svg viewBox="0 0 24 24">${ICON.personal}</svg></div><h2>Personaldossiers</h2><p>Sobald Sie Mitarbeitende in der Zeiterfassung erfasst haben, hat hier jede Person ihr eigenes Dossier: Vertrag, Zeugnisse, Lohnausweise, Absenzen.</p><a class="btn haupt" href="../zeit/#mitarbeiter">Mitarbeiter erfassen</a></div>`;
    if (Z.person && ma(Z.person)) {
      const m = ma(Z.person), l = Z.dateien.filter((d) => d.mitarbeiter_id === m.id), a = Z.antraege.filter((x) => x.mitarbeiter_id === m.id);
      const gruppen = [...new Set(l.map((d) => d.ordner_id || ''))];
      const ferien = a.filter((x) => x.art === 'ferien' && x.status === 'bewilligt' && x.von.slice(0, 4) === heute().slice(0, 4)).reduce((s, x) => s + werktage(x.von, x.bis), 0);
      return `<p class="hinweis" style="margin-bottom:8px"><a href="#" data-person-zu>← Alle Mitarbeitenden</a></p>
        <div class="kopf"><div><h1>${esc(m.name)}</h1><p class="unter">${l.length} Dokumente · ${ferien} Ferientage ${heute().slice(0, 4)} bewilligt</p></div>
          <div class="aktionen"><button class="btn" data-mitteilung-an="${m.id}">Mitteilung senden</button><button class="btn haupt" data-hoch-person="${m.id}">Dokument ablegen</button></div></div>
        ${gruppen.map((g) => { const o = ordner(g); return `<div class="card" style="margin-bottom:12px"><h2>${o ? esc(o.symbol + ' ' + o.name) : 'Ohne Ordner'}</h2>${l.filter((d) => (d.ordner_id || '') === g).map((d) => dateiZeile(d, false)).join('')}</div>`; }).join('') || '<div class="card"><p class="leer">Noch keine Dokumente. Mit „Dokument ablegen“ zum Beispiel den Arbeitsvertrag hochladen.</p></div>'}
        ${a.length ? `<div class="card abstand"><h2>Anträge</h2>${a.map(antragZeile).join('')}</div>` : ''}`;
    }
    return `<div class="kopf"><div><h1>Personal</h1><p class="unter">Ein Dossier pro Person. Was Sie freigeben, sieht der Mitarbeiter auf seinem Handy-Link.</p></div></div>
      <div class="card">${Z.mitarbeiter.map((m) => { const n = Z.dateien.filter((d) => d.mitarbeiter_id === m.id).length, o = Z.antraege.filter((a) => a.mitarbeiter_id === m.id && a.status === 'offen').length;
        return `<div class="zeile klick" data-person="${m.id}"><div style="min-width:0"><b>${esc(m.name)}${m.aktiv ? '' : '<span class="marke-s m-grau">inaktiv</span>'}</b><small>${n} Dokumente</small></div><span>${o ? `<span class="marke-s m-offen">${o} Antrag</span>` : ''} ›</span></div>`; }).join('')}</div>`;
  }
  const werktage = (von, bis) => { let n = 0; for (let x = new Date(von + 'T12:00'); x <= new Date(bis + 'T12:00'); x.setDate(x.getDate() + 1)) if (x.getDay() % 6) n++; return n; };

  /* ---------- Mitteilungen ---------- */
  function mitteilungenAnsicht() {
    const aktiv = Z.mitarbeiter.filter((m) => m.aktiv);
    return `<div class="kopf"><div><h1>Mitteilungen</h1><p class="unter">Infos ans ganze Team oder an eine Person. Erscheint oben auf dem Handy-Link der Mitarbeitenden.</p></div>
        <div class="aktionen"><button class="btn haupt" data-mitteilung-an="">+ Mitteilung</button></div></div>
      ${Z.mitteilungen.map((x) => { const an = x.mitarbeiter_id ? [ma(x.mitarbeiter_id)].filter(Boolean) : aktiv, gelesen = an.filter((m) => (x.gelesen || []).includes(m.id)).length;
        return `<div class="mitteilung ${x.wichtig ? 'wichtig' : ''}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(x.titel)}</b><small class="hinweis">${dk(x.erstellt.slice(0, 10))} · an ${x.mitarbeiter_id ? esc((ma(x.mitarbeiter_id) || {}).name || '?') : 'alle'} · gelesen ${gelesen}/${an.length}</small></div>
          ${x.text ? `<p style="margin-top:6px;white-space:pre-wrap">${esc(x.text)}</p>` : ''}<div class="aktionen" style="margin-top:8px"><button class="btn klein rot" data-mitteilung-weg="${x.id}">Löschen</button></div></div>`; }).join('') || '<div class="card"><p class="leer">Noch keine Mitteilungen. Zum Beispiel: „Betriebsferien vom 22.12. bis 5.1.“ oder „Neue Arbeitskleider im Lager abholen“.</p></div>'}`;
  }
  function mitteilungDialog(an = '') {
    const d = $('dlg');
    d.innerHTML = `<form class="dlg"><h3>Mitteilung</h3>
      <label>An<select name="an"><option value="">Alle Mitarbeitenden</option>${Z.mitarbeiter.filter((m) => m.aktiv).map((m) => `<option value="${m.id}" ${m.id === an ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
      <label>Titel<input type="text" name="titel" maxlength="120" required placeholder="z. B. Betriebsferien 22.12. bis 5.1."></label>
      <label>Text <small>(freiwillig)</small><textarea name="text" rows="4" maxlength="3000"></textarea></label>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tinte)"><input type="checkbox" name="wichtig" style="width:18px;height:18px"> Wichtig (rot markiert)</label>
      <div class="fuss"><span></span><span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt">Senden</button></span></div></form>`;
    d.onclick = (e) => { if (e.target.closest('[data-zu]')) d.close(); };
    d.onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(d.querySelector('form')));
      const { error } = await sb.from('ab_mitteilungen').insert({ mitarbeiter_id: f.an || null, titel: f.titel.trim(), text: f.text.trim() || null, wichtig: !!f.wichtig });
      if (error) { toast(fehlerText(error)); return; }
      d.close(); Z.tab = 'mitteilungen'; await laden(); toast('✓ Mitteilung gesendet');
    };
    d.showModal();
  }

  /* ---------- Anträge ---------- */
  const antragZeile = (a) => { const m = ma(a.mitarbeiter_id) || {}, [st, cls] = STATUS[a.status];
    return `<div class="zeile"><div style="min-width:0"><b>${esc(ANTRAG[a.art])} · ${esc(m.name || '')}</b><small>${dk(a.von)}${a.bis !== a.von ? ' bis ' + dk(a.bis) : ''} · ${werktage(a.von, a.bis)} Arbeitstage${a.text ? ' · ' + esc(a.text) : ''}</small>${a.antwort ? `<small>Antwort: ${esc(a.antwort)}</small>` : ''}</div>
      <span class="aktionen">${a.status === 'offen' ? `<button class="btn klein haupt" data-antrag="${a.id}" data-wert="bewilligt">Bewilligen</button><button class="btn klein" data-antrag="${a.id}" data-wert="abgelehnt">Ablehnen</button>` : `<span class="marke-s ${cls}">${st}</span>`}</span></div>`; };
  function antraegeAnsicht() {
    const offen = Z.antraege.filter((a) => a.status === 'offen'), rest = Z.antraege.filter((a) => a.status !== 'offen');
    return `<div class="kopf"><div><h1>Anträge</h1><p class="unter">Ferien, Kompensation und Absenzen, von den Mitarbeitenden direkt auf dem Handy beantragt.</p></div></div>
      <div class="card" style="margin-bottom:14px"><h2>Offen</h2>${offen.map(antragZeile).join('') || '<p class="leer">Keine offenen Anträge.</p>'}</div>
      ${rest.length ? `<div class="card"><h2>Erledigt</h2>${rest.slice(0, 60).map(antragZeile).join('')}</div>` : ''}
      <p class="hinweis abstand">Ihre Mitarbeitenden finden „Ferien oder Abwesenheit melden“ unten auf ihrem Handy-Link.</p>`;
  }

  /* ---------- Bewerbungen (Zusatzoption) ---------- */
  const BW_STATUS = [['neu', 'Neu', 'm-offen'], ['interessant', 'Interessant', 'm-blau'], ['gespraech', 'Gespräch', 'm-blau'], ['zusage', 'Zusage', 'm-ok'], ['absage', 'Absage', 'm-grau']];
  const bwFrei = () => { const l = window.NASUVIA_LIZENZ || {}; return l.status === 'test' || !!(l.zusatz || {}).bewerbungen || !K.produkt; };
  const bwLink = (s) => new URL('../b/?s=' + s.token, location.href).href;
  function bewerbungenAnsicht() {
    if (!bwFrei()) return `<div class="start"><div class="gross"><svg viewBox="0 0 24 24">${ICON.bewerbungen}</svg></div><h2>Bewerbungen an einem Ort</h2>
      <p>Mit der Zusatzoption erhalten Sie für jede offene Stelle einen eigenen Bewerbungs-Link für Website, Inserate und Social Media. Bewerbungen mit Lebenslauf und Zeugnissen kommen hier an. Sie sortieren, bewerten und antworten mit einem Tipp.</p>
      <p><b>CHF 9 pro Monat</b> oder CHF 90 pro Jahr, zu jedem Firmenpaket.</p><a class="btn haupt" href="../lizenz/#zusatzBewerbungen">Zusatzoption bestellen</a></div>`;
    if (Z.bwOffen) { const b = Z.bewerbungen.find((x) => x.id === Z.bwOffen); if (b) return bewerbungDetail(b); }
    const l = Z.bewerbungen.filter((b) => Z.bwFilter === 'alle' || (Z.bwFilter === 'aktiv' ? !['absage'].includes(b.status) : b.status === Z.bwFilter));
    const stelle = (id) => Z.stellen.find((s) => s.id === id);
    return `<div class="kopf"><div><h1>Bewerbungen</h1><p class="unter">Ein Link pro Stelle. Bewerbungen kommen hier an, mit allen Unterlagen.</p></div><div class="aktionen"><button class="btn haupt" data-bw-stelle-neu>+ Offene Stelle</button></div></div>
      <div class="card" style="margin-bottom:14px"><h2>Offene Stellen</h2>${Z.stellen.map((s) => `<div class="zeile"><div style="min-width:0"><b>${esc(s.titel)}${s.aktiv ? '' : '<span class="marke-s m-grau">pausiert</span>'}</b><small>${esc([s.ort, s.pensum].filter(Boolean).join(' · '))} · ${Z.bewerbungen.filter((b) => b.stelle_id === s.id).length} Bewerbungen</small></div>
        <span class="aktionen"><button class="btn klein" data-bw-kopie="${s.id}">Link kopieren</button><a class="btn klein" href="${bwLink(s)}" target="_blank" rel="noopener">Ansehen</a><button class="btn klein" data-bw-stelle="${s.id}">Bearbeiten</button></span></div>`).join('') || '<p class="leer">Noch keine Stelle. Mit „+ Offene Stelle“ erhalten Sie den Link für Ihre Website oder ein Inserat.</p>'}</div>
      <div class="filter">${[['aktiv', 'Offen'], ...BW_STATUS.map(([k, n]) => [k, n]), ['alle', 'Alle']].map(([k, n]) => `<button class="btn klein ${Z.bwFilter === k ? 'haupt' : ''}" data-bw-filter="${k}">${n}${k !== 'alle' && k !== 'aktiv' ? ' ' + Z.bewerbungen.filter((b) => b.status === k).length : ''}</button>`).join('')}</div>
      <div class="card">${l.map((b) => { const st = BW_STATUS.find((x) => x[0] === b.status); return `<div class="zeile klick" data-bw="${b.id}"><div style="min-width:0"><b>${esc(b.vorname + ' ' + b.nachname)} ${'★'.repeat(b.bewertung || 0)}</b><small>${esc((stelle(b.stelle_id) || {}).titel || 'Stelle gelöscht')} · ${dk(b.erstellt.slice(0, 10))} · ${(b.dateien || []).length} Dateien</small></div><span class="marke-s ${st[2]}">${st[1]}</span></div>`; }).join('') || '<p class="leer">Keine Bewerbungen in dieser Ansicht.</p>'}</div>`;
  }
  function bewerbungDetail(b) {
    const s = Z.stellen.find((x) => x.id === b.stelle_id) || {};
    const firma = ((window.NASUVIA_LIZENZ || {}).firma) || 'unsere Firma';
    const mail = (art) => `mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent('Ihre Bewerbung' + (s.titel ? ': ' + s.titel : ''))}&body=${encodeURIComponent(art === 'einladung'
      ? `Guten Tag ${b.vorname} ${b.nachname}\n\nVielen Dank für Ihre Bewerbung. Gerne lernen wir Sie persönlich kennen. Passt Ihnen ein Gespräch am … um … Uhr?\n\nFreundliche Grüsse\n${firma}`
      : `Guten Tag ${b.vorname} ${b.nachname}\n\nVielen Dank für Ihre Bewerbung und Ihr Interesse an ${firma}. Nach sorgfältiger Prüfung haben wir uns für eine andere Person entschieden. Wir wünschen Ihnen für Ihre Zukunft alles Gute.\n\nFreundliche Grüsse\n${firma}`)}`;
    return `<p class="hinweis" style="margin-bottom:8px"><a href="#" data-bw-zu>← Alle Bewerbungen</a></p>
      <div class="kopf"><div><h1>${esc(b.vorname + ' ' + b.nachname)}</h1><p class="unter">${esc(s.titel || '')} · ${dk(b.erstellt.slice(0, 10))}</p></div>
        <div class="aktionen"><a class="btn" href="${mail('einladung')}">Zum Gespräch einladen</a><a class="btn" href="${mail('absage')}">Absage schreiben</a></div></div>
      <div class="raster r2"><div class="card"><h2>Kontakt</h2><p><a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.telefon ? `<br><a href="tel:${esc(b.telefon)}">${esc(b.telefon)}</a>` : ''}</p>${b.nachricht ? `<h2 class="abstand">Nachricht</h2><p style="white-space:pre-wrap">${esc(b.nachricht)}</p>` : ''}</div>
        <div class="card"><h2>Unterlagen</h2>${(b.dateien || []).map((d, i) => `<div class="zeile klick" data-bw-datei="${i}"><div><b>📎 ${esc(d.name)}</b><small>${groesse(d.groesse || 0)}</small></div><span>Öffnen ›</span></div>`).join('') || '<p class="leer">Keine Dateien.</p>'}</div></div>
      <div class="card abstand"><h2>Stand</h2><div class="filter">${BW_STATUS.map(([k, n]) => `<button class="btn klein ${b.status === k ? 'haupt' : ''}" data-bw-status="${k}">${n}</button>`).join('')}</div>
        <div class="filter">${[1, 2, 3, 4, 5].map((n) => `<button class="btn klein" data-bw-stern="${n}" style="font-size:18px;color:${(b.bewertung || 0) >= n ? '#C9A45C' : '#C4C8D4'}">★</button>`).join('')}</div>
        <label style="display:grid;gap:4px;font-size:13px;color:var(--text)">Notiz (nur für Sie)<textarea data-bw-notiz rows="3">${esc(b.notiz || '')}</textarea></label>
        <div class="aktionen abstand"><button class="btn rot" data-bw-weg>Bewerbung löschen</button></div>
        <p class="hinweis abstand">Datenschutz: Bewerbungsunterlagen nach Abschluss der Stelle löschen, ausser die Person ist mit dem Aufbewahren einverstanden.</p></div>`;
  }
  function stelleDialog(s = null) {
    const d = $('dlg'), w = s || { titel: '', ort: '', pensum: '', start: '', beschreibung: '', aktiv: true };
    d.innerHTML = `<form class="dlg"><h3>${s ? 'Stelle bearbeiten' : 'Offene Stelle'}</h3>
      <label>Bezeichnung<input name="titel" value="${esc(w.titel)}" required maxlength="120" placeholder="z. B. Maler/in EFZ 80–100 %"></label>
      <div class="drei"><label>Ort<input name="ort" value="${esc(w.ort || '')}"></label><label>Pensum<input name="pensum" value="${esc(w.pensum || '')}" placeholder="80–100 %"></label><label>Start<input name="start" value="${esc(w.start || '')}" placeholder="nach Vereinbarung"></label></div>
      <label>Beschreibung<textarea name="beschreibung" rows="7" maxlength="6000" placeholder="Was Sie erwartet, was Sie mitbringen, was wir bieten">${esc(w.beschreibung || '')}</textarea></label>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--tinte)"><input type="checkbox" name="aktiv" ${w.aktiv ? 'checked' : ''} style="width:18px;height:18px"> Bewerbungen annehmen</label>
      <div class="fuss">${s ? '<button type="button" class="btn rot" data-weg>Löschen</button>' : '<span></span>'}<span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt">Speichern</button></span></div></form>`;
    d.onclick = async (e) => { if (e.target.closest('[data-zu]')) d.close(); if (e.target.closest('[data-weg]') && await Korb.loeschen(sb, 'bw_stellen', s.id, s.titel)) { d.close(); laden(); } };
    d.onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(d.querySelector('form')));
      const werte = { titel: f.titel.trim(), ort: f.ort || null, pensum: f.pensum || null, start: f.start || null, beschreibung: f.beschreibung || null, aktiv: !!f.aktiv };
      const r = s ? await sb.from('bw_stellen').update(werte).eq('id', s.id) : await sb.from('bw_stellen').insert(werte);
      if (r.error) { toast(fehlerText(r.error)); return; } d.close(); await laden(); toast(s ? 'Gespeichert' : '✓ Stelle erstellt. Link kopieren und auf Website oder Inserat einfügen.');
    };
    d.showModal();
  }
  document.addEventListener('click', async (e) => {
    const t = e.target; if (Z.tab !== 'bewerbungen') return;
    if (t.closest('[data-bw-stelle-neu]')) { stelleDialog(); return; }
    const se = t.closest('[data-bw-stelle]'); if (se) { stelleDialog(Z.stellen.find((x) => x.id === se.dataset.bwStelle)); return; }
    const ko = t.closest('[data-bw-kopie]'); if (ko) { const l = bwLink(Z.stellen.find((x) => x.id === ko.dataset.bwKopie)); try { await navigator.clipboard.writeText(l); toast('✓ Link kopiert'); } catch { UI.eingabe('Link kopieren:', { vorgabe: l }); } return; }
    const fi = t.closest('[data-bw-filter]'); if (fi) { Z.bwFilter = fi.dataset.bwFilter; zeichnen(); return; }
    const bw = t.closest('[data-bw]'); if (bw) { Z.bwOffen = bw.dataset.bw; zeichnen(); scrollTo(0, 0); return; }
    if (t.closest('[data-bw-zu]')) { e.preventDefault(); Z.bwOffen = null; zeichnen(); return; }
    const b = Z.bewerbungen.find((x) => x.id === Z.bwOffen); if (!b) return;
    const st = t.closest('[data-bw-status]'); if (st) { b.status = st.dataset.bwStatus; zeichnen(); await sb.from('bw_bewerbungen').update({ status: b.status }).eq('id', b.id); return; }
    const sn = t.closest('[data-bw-stern]'); if (sn) { b.bewertung = Number(sn.dataset.bwStern) === b.bewertung ? 0 : Number(sn.dataset.bwStern); zeichnen(); await sb.from('bw_bewerbungen').update({ bewertung: b.bewertung }).eq('id', b.id); return; }
    const da = t.closest('[data-bw-datei]'); if (da) { const d = b.dateien[Number(da.dataset.bwDatei)]; const f = window.open('', '_blank'); const { data, error } = await sb.storage.from('bewerbungen').createSignedUrl(d.pfad, 300); if (error || !data) { if (f) f.close(); toast('Datei nicht gefunden'); return; } if (f) f.location = data.signedUrl; else location.href = data.signedUrl; return; }
    if (t.closest('[data-bw-weg]')) { if (!await UI.frage(`Bewerbung von ${b.vorname} ${b.nachname} mit allen Unterlagen endgültig löschen?`)) return; if ((b.dateien || []).length) await sb.storage.from('bewerbungen').remove(b.dateien.map((d) => d.pfad)); await sb.from('bw_bewerbungen').delete().eq('id', b.id); Z.bwOffen = null; await laden(); toast('Gelöscht'); }
  });
  document.addEventListener('change', async (e) => { if (e.target.matches('[data-bw-notiz]') && Z.bwOffen) { const b = Z.bewerbungen.find((x) => x.id === Z.bwOffen); b.notiz = e.target.value; await sb.from('bw_bewerbungen').update({ notiz: b.notiz }).eq('id', b.id); toast('Notiz gespeichert'); } });

  /* ---------- Ereignisse ---------- */
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const tb = t.closest('[data-tab]'); if (tb) { Z.tab = tb.dataset.tab; Z.offen = null; Z.person = null; Z.bwOffen = null; history.replaceState(null, '', '?tab=' + Z.tab); zeichnen(); scrollTo(0, 0); return; }
    const mehr = t.closest('[data-datei-mehr]'); if (mehr) { e.stopPropagation(); dateiDialog(Z.dateien.find((d) => d.id === mehr.dataset.dateiMehr)); return; }
    const da = t.closest('[data-datei]'); if (da) { oeffnen(Z.dateien.find((d) => d.id === da.dataset.datei)); return; }
    const or = t.closest('[data-ordner]'); if (or) { Z.offen = or.dataset.ordner; zeichnen(); scrollTo(0, 0); dropZone($('drop'), async (l) => { const n = await hochladen(l, { ordner_id: Z.offen }); await laden(); if (n) toast(`✓ ${n} gespeichert`); }); return; }
    if (t.closest('[data-zurueck]')) { e.preventDefault(); Z.offen = null; zeichnen(); return; }
    const ob = t.closest('[data-ordner-bearb]'); if (ob) { ordnerDialog(ordner(ob.dataset.ordnerBearb)); return; }
    const id = t.closest('[data-idee]'); if (id) { const { error } = await sb.from('ab_ordner').insert({ name: id.dataset.idee, symbol: id.dataset.sym, farbe: id.dataset.farbe, sortierung: Z.ordner.length }); if (error) { toast(fehlerText(error)); return; } await laden(); toast(`Ordner „${id.dataset.idee}“ angelegt`); return; }
    const pe = t.closest('[data-person]'); if (pe) { Z.person = pe.dataset.person; zeichnen(); scrollTo(0, 0); return; }
    if (t.closest('[data-person-zu]')) { e.preventDefault(); Z.person = null; zeichnen(); return; }
    const hp = t.closest('[data-hoch-person]'); if (hp) { hochladenDialog({ ma: hp.dataset.hochPerson }); return; }
    const mi = t.closest('[data-mitteilung-an]'); if (mi) { mitteilungDialog(mi.dataset.mitteilungAn); return; }
    const mw = t.closest('[data-mitteilung-weg]'); if (mw) { if (!await UI.frage('Diese Mitteilung löschen? Die Mitarbeitenden sehen sie danach nicht mehr.')) return; await sb.from('ab_mitteilungen').update({ geloescht_am: new Date().toISOString() }).eq('id', mw.dataset.mitteilungWeg); laden(); return; }
    const an = t.closest('[data-antrag]');
    if (an) {
      const antwort = await UI.eingabe(an.dataset.wert === 'bewilligt' ? 'Bewilligen. Kurze Nachricht an den Mitarbeiter (freiwillig):' : 'Ablehnen. Bitte kurz begründen:', { ja: an.dataset.wert === 'bewilligt' ? 'Bewilligen' : 'Ablehnen' });
      if (antwort === null) return;
      const { error } = await sb.from('ab_antraege').update({ status: an.dataset.wert, antwort: antwort.trim() || null, entschieden: new Date().toISOString() }).eq('id', an.dataset.antrag);
      if (error) { toast(fehlerText(error)); return; } await laden(); toast(an.dataset.wert === 'bewilligt' ? '✓ Bewilligt' : 'Abgelehnt'); return;
    }
    const a = t.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'ordnerNeu') ordnerDialog();
    if (a.dataset.a === 'hoch') hochladenDialog();
    if (a.dataset.a === 'korb') Korb.oeffnen(sb, [{ tabelle: 'ab_dateien', art: 'Datei', titel: (r) => r.name, dateien: async (l) => { await sb.storage.from('ablage').remove(l.map((d) => d.pfad)); } }, { tabelle: 'ab_ordner', art: 'Ordner', titel: (r) => r.name }], laden);
  });
  document.addEventListener('change', async (e) => {
    const h = e.target.closest && e.target.closest('[data-hoch-ordner]');
    if (h && h.files.length) { const n = await hochladen([...h.files], { ordner_id: h.dataset.hochOrdner }); await laden(); if (n) toast(`✓ ${n} ${n === 1 ? 'Datei' : 'Dateien'} gespeichert`); }
  });
  let sucheZeit;
  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-suche]')) return;
    clearTimeout(sucheZeit); sucheZeit = setTimeout(() => { Z.suche = e.target.value; zeichnen(); const n = document.querySelector('[data-suche]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
  });
  zeichnen();
  laden();
})();
