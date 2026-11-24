/* Ordasio – Projekte (Zusatzpaket „Projekte & Lager“)
   Projekte sind die Aufträge aus der Zeiterfassung. Hier kommen Stunden, Material, Ausgaben mit Kostenstelle,
   Budget und Fotos zusammen. Aus einem Rapport mit Unterschrift des Kunden wird mit einem Klick die Rechnung. */
(() => {
  'use strict';
  const K = window.NASUVIA_KONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const chf = (r) => fmt.format((r || 0) / 100);
  const std = (min) => (Math.round((min || 0) / 6) / 10).toLocaleString('de-CH');
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const betragLesen = (t) => { const n = Number(String(t || '').replace(/[’'\s]/g, '').replace(/^CHF/i, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) : null; };
  const toast = (t, ms = 2800) => { const e = $('toast'); e.textContent = t; e.classList.add('da'); clearTimeout(toast.z); toast.z = setTimeout(() => e.classList.remove('da'), ms); };
  const fehlerText = (e) => String((e && e.message) || e || 'Unbekannter Fehler');
  const ICON = {
    projekte: '<path d="M4 20h16M6 20V9l6-5 6 5v11"/><path d="M10 20v-6h4v6"/>',
    kostenstellen: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    rapporte: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h4"/>',
  };
  const TABS = [['projekte', 'Projekte'], ['kostenstellen', 'Kostenstellen'], ['rapporte', 'Rapporte']];
  const Z = { tab: 'projekte', offen: null, auftraege: [], eintraege: [], ma: [], bewegungen: [], artikel: [], rapporte: [], buchungen: [], archiv: false, bereit: false };
  const q = new URLSearchParams(location.search);
  if (TABS.some(([id]) => id === q.get('tab'))) Z.tab = q.get('tab');
  if (q.get('projekt')) Z.offen = q.get('projekt');

  if (!K.produkt) { $('inhalt').innerHTML = '<div class="start"><h2>Projekte</h2><p>Projekte gibt es in der Verkaufsversion (Ordasio).</p></div>'; return; }
  const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } });
  const auftrag = (id) => Z.auftraege.find((a) => a.id === id);
  const ma = (id) => Z.ma.find((m) => m.id === id) || {};
  const art = (id) => Z.artikel.find((a) => a.id === id) || {};

  // Ausgaben aus der Buchhaltung mit Kostenstelle (lokal auf dem Gerät)
  function buchungenLesen() {
    return new Promise((ok) => {
      try {
        const r = indexedDB.open('nasuvia-buchhaltung');
        r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('buchungen')) { db.close(); return ok([]); }
          const g = db.transaction('buchungen').objectStore('buchungen').getAll(); g.onsuccess = () => { db.close(); ok((g.result || []).filter((b) => !b.geloescht && b.kostenstelle)); }; g.onerror = () => ok([]); };
        r.onerror = () => ok([]);
      } catch { ok([]); }
    });
  }

  async function laden() {
    try {
      const [a, e, m, b, ar, r] = await Promise.all([
        sb.from('ze_auftraege').select('*').is('geloescht_am', null).order('aktiv', { ascending: false }).order('name'),
        sb.from('ze_eintraege').select('id,mitarbeiter_id,auftrag_id,datum,minuten,taetigkeit,km,verrechnet').is('geloescht_am', null).not('auftrag_id', 'is', null).limit(10000),
        sb.from('ze_mitarbeiter').select('id,name,stundenlohn_rappen,ansatz_rappen').is('geloescht_am', null),
        sb.from('lg_bewegungen').select('id,artikel_id,datum,menge,art,auftrag_id,verrechnet').eq('art', 'ausgang').not('auftrag_id', 'is', null).limit(5000),
        sb.from('lg_artikel').select('id,name,nummer,einheit,einkauf_rappen,verkauf_rappen'),
        sb.from('pr_rapporte').select('*').order('erstellt', { ascending: false }).limit(500),
      ]);
      for (const x of [a, e, m, b, ar, r]) if (x.error) throw x.error;
      Z.auftraege = a.data; Z.eintraege = e.data; Z.ma = m.data; Z.bewegungen = b.data; Z.artikel = ar.data; Z.rapporte = r.data;
      Z.buchungen = await buchungenLesen();
      // Projektliste für die Buchhaltung (Kostenstelle beim Buchen wählen)
      try { localStorage.setItem('ordasio.projekte', JSON.stringify(Z.auftraege.filter((x) => x.aktiv).map((x) => ({ id: x.id, name: x.name, kostenstelle: x.kostenstelle || '' })))); } catch {}
      Z.bereit = true; zeichnen();
    } catch (f) { $('inhalt').innerHTML = `<div class="card"><h2>Daten konnten nicht geladen werden</h2><p class="hinweis">${esc(fehlerText(f))}</p></div>`; }
  }

  /* ---------- Zahlen eines Projekts ---------- */
  function zahlen(a) {
    const ein = Z.eintraege.filter((e) => e.auftrag_id === a.id), mat = Z.bewegungen.filter((b) => b.auftrag_id === a.id);
    const aus = Z.buchungen.filter((b) => b.kostenstelle === a.id && b.typ === 'ausgabe');
    let min = 0, leistung = 0, lohn = 0, offenMin = 0, ohneAnsatz = 0;
    for (const e of ein) { const m = ma(e.mitarbeiter_id), h = e.minuten / 60; min += e.minuten; leistung += h * (m.ansatz_rappen || 0); lohn += h * (m.stundenlohn_rappen || 0); if (!e.verrechnet) offenMin += e.minuten; if (!m.ansatz_rappen) ohneAnsatz += e.minuten; }
    let matVerkauf = 0, matEinkauf = 0, matOffen = 0;
    for (const b of mat) { const x = art(b.artikel_id), menge = Math.abs(Number(b.menge) || 0); matVerkauf += menge * (x.verkauf_rappen || 0); matEinkauf += menge * (x.einkauf_rappen || 0); if (!b.verrechnet) matOffen++; }
    const ausgaben = aus.reduce((s, b) => s + (b.betragRappen - (b.mwstRappen || 0)), 0);
    const ertrag = a.pauschal_rappen ? a.pauschal_rappen : Math.round(leistung + matVerkauf);
    const kosten = Math.round(lohn + matEinkauf + ausgaben);
    return { ein, mat, aus, min, offenMin, ohneAnsatz, leistung: Math.round(leistung), lohn: Math.round(lohn), matVerkauf: Math.round(matVerkauf), matEinkauf: Math.round(matEinkauf), matOffen, ausgaben, ertrag, kosten, marge: ertrag - kosten,
      budget: a.budget_rappen || 0, verbraucht: a.budget_rappen ? Math.round((leistung + matVerkauf + ausgaben) / a.budget_rappen * 100) : 0 };
  }

  function zeichnen() {
    $('tabs').innerHTML = TABS.map(([id, n]) => `<button class="${Z.tab === id ? 'an' : ''}" data-tab="${id}">${n}</button>`).join('');
    $('untenNav').innerHTML = TABS.map(([id, n]) => `<button class="${Z.tab === id ? 'an' : ''}" data-tab="${id}"><svg viewBox="0 0 24 24">${ICON[id]}</svg>${n}</button>`).join('');
    if (!Z.bereit) return;
    if (Z.tab === 'projekte' && Z.offen && auftrag(Z.offen)) { $('inhalt').innerHTML = detail(auftrag(Z.offen)); fotosLaden(auftrag(Z.offen)); return; }
    $('inhalt').innerHTML = ({ projekte: liste, kostenstellen: kostenstellen, rapporte: rapporteListe })[Z.tab]();
  }

  function liste() {
    const l = Z.auftraege.filter((a) => !!a.aktiv !== Z.archiv);
    const alle = Z.auftraege.filter((a) => a.aktiv).map(zahlen);
    const sum = (k) => alle.reduce((s, x) => s + x[k], 0);
    return `<div class="kopf"><div><h1>Projekte</h1><p class="unter">Stunden, Material und Ausgaben pro Auftrag. Sehen Sie, was rentiert.</p></div>
      <div class="aktionen"><button class="btn" data-a="archiv">${Z.archiv ? 'Laufende zeigen' : 'Abgeschlossene'}</button><button class="btn haupt" data-a="neu">+ Projekt</button></div></div>
      ${Z.archiv ? '' : `<div class="pj-kz"><div class="card"><div class="label">Laufende Projekte</div><div class="wert">${alle.length}</div></div>
        <div class="card"><div class="label">Leistung</div><div class="wert">${chf(sum('ertrag'))}</div></div>
        <div class="card"><div class="label">Kosten</div><div class="wert">${chf(sum('kosten'))}</div></div>
        <div class="card"><div class="label">Marge</div><div class="wert ${sum('marge') < 0 ? 'minus' : 'plus'}">${chf(sum('marge'))}</div></div></div>`}
      <div class="card">${l.length ? l.map((a) => { const z = zahlen(a); return `<div class="zeile klick" data-projekt="${a.id}"><div style="min-width:0"><b>${esc(a.name)}${a.kostenstelle ? ` <span class="marke-s m-grau">${esc(a.kostenstelle)}</span>` : ''}</b>
          <small>${esc([a.kunde, std(z.min) + ' Std.', z.offenMin ? std(z.offenMin) + ' Std. offen' : '', z.budget ? 'Budget ' + z.verbraucht + ' %' : ''].filter(Boolean).join(' · '))}</small>
          ${z.budget ? `<div class="pj-spur"><i class="${z.verbraucht > 100 ? 'ueber' : ''}" style="width:${Math.min(100, z.verbraucht)}%"></i></div>` : ''}</div>
          <div class="betrag ${z.marge < 0 ? 'rot' : ''}">${chf(z.ertrag)}<small style="display:block;text-align:right">Marge ${chf(z.marge)}</small></div></div>`; }).join('')
        : `<p class="leer">${Z.archiv ? 'Keine abgeschlossenen Projekte.' : 'Noch keine Projekte. Ein Projekt ist ein Auftrag aus der Zeiterfassung: legen Sie ihn dort an, Stunden und Material laufen dann automatisch hierher.'}</p>`}</div>
      <p class="hinweis abstand">Leistung = Stunden × Verrechnungsansatz + Material zum Verkaufspreis (oder Pauschale). Kosten = Lohnkosten + Material zum Einkaufspreis + Ausgaben mit dieser Kostenstelle.</p>`;
  }

  function detail(a) {
    const z = zahlen(a);
    const proMa = {}; for (const e of z.ein) { const k = e.mitarbeiter_id; proMa[k] = (proMa[k] || 0) + e.minuten; }
    const proArt = {}; for (const b of z.mat) { proArt[b.artikel_id] = (proArt[b.artikel_id] || 0) + Math.abs(Number(b.menge) || 0); }
    const rp = Z.rapporte.filter((r) => r.auftrag_id === a.id);
    return `<div class="kopf"><div><h1>${esc(a.name)}</h1><p class="unter">${esc([a.kunde, a.adresse, a.kostenstelle ? 'Kostenstelle ' + a.kostenstelle : ''].filter(Boolean).join(' · '))}</p></div>
      <div class="aktionen"><button class="btn" data-a="bearbeiten">Budget und Kostenstelle</button><button class="btn" data-a="rapport">Rapport erstellen</button><button class="btn haupt" data-a="rechnung" ${z.offenMin || z.matOffen ? '' : 'disabled'}>Offenes verrechnen</button></div></div>
      <div class="pj-kz"><div class="card"><div class="label">Stunden</div><div class="wert">${std(z.min)}</div><small class="hinweis">${z.offenMin ? std(z.offenMin) + ' noch offen' : 'alles verrechnet'}</small></div>
        <div class="card"><div class="label">${a.pauschal_rappen ? 'Pauschale' : 'Leistung'}</div><div class="wert">${chf(z.ertrag)}</div></div>
        <div class="card"><div class="label">Kosten</div><div class="wert">${chf(z.kosten)}</div></div>
        <div class="card"><div class="label">Marge</div><div class="wert ${z.marge < 0 ? 'minus' : 'plus'}">${chf(z.marge)}</div><small class="hinweis">${z.ertrag ? Math.round(z.marge / z.ertrag * 100) + ' %' : ''}</small></div></div>
      ${z.budget ? `<div class="card abstand-unten" style="margin-bottom:14px"><b>Budget ${chf(z.budget)} · ${z.verbraucht} % verbraucht</b><div class="pj-spur"><i class="${z.verbraucht > 100 ? 'ueber' : ''}" style="width:${Math.min(100, z.verbraucht)}%"></i></div>${z.verbraucht > 90 ? `<p class="hinweis" style="margin-top:6px">${z.verbraucht > 100 ? '⚠️ Budget überschritten.' : '⚠️ Budget fast aufgebraucht.'} Sprechen Sie mit dem Kunden über Mehraufwand.</p>` : ''}</div>` : ''}
      ${z.ohneAnsatz ? `<p class="hinweis" style="margin-bottom:12px">⚠️ ${std(z.ohneAnsatz)} Std. von Mitarbeitenden ohne Verrechnungsansatz. Tragen Sie den Ansatz in der Zeiterfassung unter Mitarbeiter ein.</p>` : ''}
      <div class="raster" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px">
        <div class="card"><h2>Stunden</h2>${Object.keys(proMa).length ? Object.entries(proMa).map(([id, m]) => `<div class="zeile"><div><b>${esc(ma(id).name || 'Mitarbeiter')}</b><small>${ma(id).ansatz_rappen ? 'CHF ' + chf(ma(id).ansatz_rappen) + '/Std.' : 'ohne Ansatz'}</small></div><div class="betrag">${std(m)} Std.</div></div>`).join('') : '<p class="leer">Noch keine Stunden.</p>'}</div>
        <div class="card"><h2>Material</h2>${Object.keys(proArt).length ? Object.entries(proArt).map(([id, m]) => `<div class="zeile"><div><b>${esc(art(id).name || 'Artikel')}</b><small>${m.toLocaleString('de-CH')} ${esc(art(id).einheit || '')}</small></div><div class="betrag">${chf(m * (art(id).verkauf_rappen || 0))}</div></div>`).join('') : '<p class="leer">Kein Material. Im Lager beim Ausgang dieses Projekt wählen.</p>'}</div>
        <div class="card"><h2>Ausgaben</h2>${z.aus.length ? z.aus.map((b) => `<div class="zeile"><div><b>${esc(b.text || b.partner || 'Ausgabe')}</b><small>${dk(b.datum)}</small></div><div class="betrag">${chf(b.betragRappen - (b.mwstRappen || 0))}</div></div>`).join('') : '<p class="leer">Keine Ausgaben. In der Buchhaltung beim Erfassen das Projekt als Kostenstelle wählen.</p>'}</div>
        <div class="card"><h2>Rapporte</h2>${rp.length ? rp.map((r) => `<div class="zeile klick" data-rapport="${r.id}"><div><b>Rapport ${esc(r.nummer || '')} · ${dk(r.datum)}</b><small>${r.unterschrieben_am ? '✓ unterschrieben von ' + esc(r.unterschrieben_von || 'Kunde') : 'noch nicht unterschrieben'}</small></div><div>${r.verrechnet ? '<span class="marke-s m-ok">verrechnet</span>' : ''}</div></div>`).join('') : '<p class="leer">Noch kein Rapport.</p>'}</div>
      </div>
      <div class="card" style="margin-top:14px"><h2>Fotos</h2><div class="pj-fotos" id="fotos"><p class="leer">Wird geladen …</p></div></div>`;
  }
  async function fotosLaden(a) {
    const box = $('fotos'); if (!box) return;
    const { data } = await sb.from('ze_fotos').select('id,pfad,notiz,erstellt').eq('auftrag_id', a.id).is('geloescht_am', null).order('erstellt', { ascending: false }).limit(60);
    if (!data || !data.length) { box.innerHTML = '<p class="leer" style="grid-column:1/-1">Noch keine Fotos. Mitarbeitende machen sie auf dem Handy direkt zum Auftrag.</p>'; return; }
    const { data: urls } = await sb.storage.from('auftrag-fotos').createSignedUrls(data.map((x) => x.pfad), 3600);
    Z.fotoUrls = {}; data.forEach((f, i) => { Z.fotoUrls[f.id] = (urls && urls[i] && urls[i].signedUrl) || ''; });
    box.innerHTML = data.map((f) => `<a href="${esc(Z.fotoUrls[f.id])}" target="_blank" rel="noopener"><img src="${esc(Z.fotoUrls[f.id])}" alt="${esc(f.notiz || 'Foto')}" loading="lazy"></a>`).join('');
    Z.fotos = data;
  }

  /* ---------- Kostenstellen ---------- */
  function kostenstellen() {
    const gruppen = {};
    for (const a of Z.auftraege) { const k = a.kostenstelle || 'Ohne Kostenstelle'; const z = zahlen(a); const g = gruppen[k] = gruppen[k] || { ertrag: 0, kosten: 0, min: 0, n: 0 }; g.ertrag += z.ertrag; g.kosten += z.kosten; g.min += z.min; g.n++; }
    const max = Math.max(1, ...Object.values(gruppen).map((g) => Math.max(g.ertrag, g.kosten)));
    return `<div class="kopf"><div><h1>Kostenstellen</h1><p class="unter">Leistung und Kosten nach Kostenstelle (z. B. Abteilung, Filiale, Sparte).</p></div></div>
      <div class="card">${Object.keys(gruppen).length ? Object.entries(gruppen).sort((a, b) => b[1].ertrag - a[1].ertrag).map(([k, g]) => `<div class="zeile" style="display:block"><div class="pj-zeile"><b>${esc(k)}</b><b class="${g.ertrag - g.kosten < 0 ? 'rot' : ''}">Marge ${chf(g.ertrag - g.kosten)}</b>
        <small>${g.n} ${g.n === 1 ? 'Projekt' : 'Projekte'} · ${std(g.min)} Std.</small><small style="text-align:right">Leistung ${chf(g.ertrag)} · Kosten ${chf(g.kosten)}</small></div>
        <div class="pj-spur"><i style="width:${g.ertrag / max * 100}%"></i></div><div class="pj-spur"><i class="ueber" style="width:${g.kosten / max * 100}%;opacity:.55"></i></div></div>`).join('') : '<p class="leer">Noch keine Projekte.</p>'}</div>
      <p class="hinweis abstand">Kostenstelle eines Projekts: Projekt öffnen › „Budget und Kostenstelle“. Ausgaben ordnen Sie in der Buchhaltung beim Erfassen einem Projekt zu.</p>`;
  }

  /* ---------- Rapporte ---------- */
  function rapporteListe() {
    return `<div class="kopf"><div><h1>Rapporte</h1><p class="unter">Arbeitsrapporte mit Stunden, Material, Fotos und Unterschrift des Kunden.</p></div></div>
      <div class="card">${Z.rapporte.length ? Z.rapporte.map((r) => `<div class="zeile klick" data-rapport="${r.id}"><div style="min-width:0"><b>Rapport ${esc(r.nummer || '')} · ${esc((auftrag(r.auftrag_id) || {}).name || (r.daten || {}).projekt || '')}</b><small>${dk(r.datum)} · ${r.unterschrieben_am ? '✓ unterschrieben' : 'offen'}${r.verrechnet ? ' · verrechnet' : ''}</small></div><div class="betrag">${chf((r.daten || {}).total || 0)}</div></div>`).join('')
        : '<p class="leer">Noch keine Rapporte. Öffnen Sie ein Projekt und tippen Sie auf „Rapport erstellen“.</p>'}</div>`;
  }
  function rapportPositionen(a, nurOffen = true) {
    const z = zahlen(a), pos = [];
    const gruppen = new Map();
    for (const e of z.ein) { if (nurOffen && e.verrechnet) continue; const k = e.mitarbeiter_id + '|' + (e.taetigkeit || '').toLowerCase(); if (!gruppen.has(k)) gruppen.set(k, { m: ma(e.mitarbeiter_id), t: e.taetigkeit, min: 0, tage: [], ids: [] }); const g = gruppen.get(k); g.min += e.minuten; g.ids.push(e.id); if (!g.tage.includes(e.datum)) g.tage.push(e.datum); }
    for (const g of gruppen.values()) pos.push({ art: 'stunden', ids: g.ids, text: `${g.t || 'Arbeit'} (${g.m.name || 'Mitarbeiter'}, ${g.tage.sort().map((d) => dk(d).slice(0, 5)).join(' ')})`, menge: Math.round(g.min / 6) / 10, einheit: 'Std.', preis: g.m.ansatz_rappen || 0 });
    const proArt = new Map();
    for (const b of z.mat) { if (nurOffen && b.verrechnet) continue; const x = proArt.get(b.artikel_id) || { a: art(b.artikel_id), menge: 0, ids: [] }; x.menge += Math.abs(Number(b.menge) || 0); x.ids.push(b.id); proArt.set(b.artikel_id, x); }
    for (const x of proArt.values()) pos.push({ art: 'material', ids: x.ids, text: (x.a.name || 'Material') + (x.a.nummer ? ` (${x.a.nummer})` : ''), menge: Math.round(x.menge * 100) / 100, einheit: x.a.einheit || 'Stk.', preis: x.a.verkauf_rappen || 0 });
    const km = z.ein.filter((e) => !(nurOffen && e.verrechnet)).reduce((s, e) => s + Number(e.km || 0), 0);
    if (km) pos.push({ art: 'km', text: `Fahrspesen ${km} km`, menge: km, einheit: 'km', preis: 70 });
    return pos;
  }
  const naechsteNr = () => { const j = heute().slice(0, 4); const n = Z.rapporte.filter((r) => (r.nummer || '').startsWith('RP-' + j)).length + 1; return `RP-${j}-${String(n).padStart(3, '0')}`; };
  async function rapportErstellen(a) {
    const pos = rapportPositionen(a);
    if (!pos.length) { await UI.hinweis('Für dieses Projekt gibt es keine offenen Stunden oder Material. Rapporte enthalten alles, was noch nicht verrechnet ist.'); return; }
    const total = Math.round(pos.reduce((s, p) => s + p.menge * p.preis, 0));
    const daten = { projekt: a.name, kunde: a.kunde || '', adresse: a.adresse || '', positionen: pos, total, fotos: (Z.fotos || []).slice(0, 6).map((f) => f.pfad) };
    const { data, error } = await sb.from('pr_rapporte').insert({ auftrag_id: a.id, nummer: naechsteNr(), daten }).select().single();
    if (error) { toast(fehlerText(error), 6000); return; }
    Z.rapporte.unshift(data); rapportZeigen(data);
  }
  async function rapportZeigen(r) {
    const d = r.daten || {}, dlg = $('dlg');
    let fotos = '';
    if ((d.fotos || []).length) { const { data: u } = await sb.storage.from('auftrag-fotos').createSignedUrls(d.fotos, 3600); fotos = (u || []).map((x) => x.signedUrl ? `<img src="${esc(x.signedUrl)}" alt="Foto">` : '').join(''); }
    dlg.innerHTML = `<form class="dlg" method="dialog" style="width:min(760px,calc(100vw - 24px))"><div class="rp-blatt" id="rpBlatt">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">Arbeitsrapport ${esc(r.nummer || '')}</h2><p class="hinweis">${esc(d.projekt || '')}${d.kunde ? ' · ' + esc(d.kunde) : ''}${d.adresse ? '<br>' + esc(d.adresse) : ''}</p></div><div class="hinweis">Datum ${dk(r.datum)}</div></div>
      <table style="margin-top:10px"><thead><tr><th>Leistung / Material</th><th class="r">Menge</th><th class="r">Preis</th><th class="r">Betrag</th></tr></thead><tbody>
      ${(d.positionen || []).map((p) => `<tr><td>${esc(p.text)}</td><td class="r">${Number(p.menge).toLocaleString('de-CH')} ${esc(p.einheit || '')}</td><td class="r">${chf(p.preis)}</td><td class="r">${chf(p.menge * p.preis)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3"><b>Total exkl. MWST</b></td><td class="r"><b>${chf(d.total)}</b></td></tr></tfoot></table>
      ${fotos ? `<div class="pj-fotos" style="margin-top:12px">${fotos}</div>` : ''}
      <div style="margin-top:16px">${r.unterschrift ? `<p class="hinweis">Unterschrieben von ${esc(r.unterschrieben_von || '')} am ${new Date(r.unterschrieben_am).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}</p><img class="unterschrift" src="${esc(r.unterschrift)}" alt="Unterschrift">`
        : `<label>Name des Kunden<input id="sigName" autocomplete="name" value="${esc(d.kunde || '')}"></label><p class="hinweis" style="margin:8px 0 4px">Bitte hier mit dem Finger unterschreiben:</p><canvas class="sig" id="sig"></canvas><button type="button" class="btn klein" data-a="sigLeeren" style="margin-top:6px">Neu unterschreiben</button>`}</div></div>
      <div class="aktionen" style="margin-top:12px;justify-content:flex-end;flex-wrap:wrap;display:flex;gap:8px">
        <button type="button" class="btn" data-a="drucken">Drucken / PDF</button>
        ${r.unterschrift ? '' : '<button type="button" class="btn haupt" data-a="unterschreiben">Unterschrift speichern</button>'}
        ${r.verrechnet ? '' : `<button type="button" class="btn ${r.unterschrift ? 'haupt' : ''}" data-a="rpRechnung">In Rechnung übernehmen</button>`}
        <button type="button" class="btn rot" data-a="rpLoeschen">Löschen</button><button class="btn" value="zu">Schliessen</button></div></form>`;
    Z.rapport = r;
    if (!dlg.open) dlg.showModal();
    unterschriftFeld();
  }
  function unterschriftFeld() {
    const c = $('sig'); if (!c) return;
    const dpr = window.devicePixelRatio || 1, rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0A1F17';
    let zieht = false; c.dataset.leer = '1';
    const punkt = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.onpointerdown = (e) => { zieht = true; c.setPointerCapture(e.pointerId); const [x, y] = punkt(e); g.beginPath(); g.moveTo(x, y); };
    c.onpointermove = (e) => { if (!zieht) return; const [x, y] = punkt(e); g.lineTo(x, y); g.stroke(); c.dataset.leer = ''; };
    c.onpointerup = c.onpointercancel = () => { zieht = false; };
  }
  async function inRechnung(positionen, titel, kunde, eintraegeIds, materialIds, rapportId) {
    if (!positionen.length) return;
    if (eintraegeIds.length) { const { error } = await sb.from('ze_eintraege').update({ verrechnet: true }).in('id', eintraegeIds); if (error) { toast(fehlerText(error), 6000); return; } }
    if (materialIds.length) await sb.from('lg_bewegungen').update({ verrechnet: true }).in('id', materialIds);
    if (rapportId) await sb.from('pr_rapporte').update({ verrechnet: true }).eq('id', rapportId);
    try { sessionStorage.setItem('ordasio.zeit.rechnung', JSON.stringify({ positionen: positionen.map((p) => ({ text: p.text, menge: String(p.menge), preis: p.preis ? (p.preis / 100).toFixed(2) : '' })), projekt: titel, kunde: kunde || '', quelle: 'Projekte' })); } catch {}
    location.href = '../rechnungen/';
  }

  /* ---------- Klicks ---------- */
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const tab = t.closest('[data-tab]'); if (tab) { Z.tab = tab.dataset.tab; Z.offen = null; zeichnen(); scrollTo(0, 0); if (window.OrdasioZurueck && OrdasioZurueck.aktualisieren) OrdasioZurueck.aktualisieren(); return; }
    const pj = t.closest('[data-projekt]'); if (pj) { Z.offen = pj.dataset.projekt; Z.fotos = []; zeichnen(); scrollTo(0, 0); if (window.OrdasioZurueck && OrdasioZurueck.aktualisieren) OrdasioZurueck.aktualisieren(); return; }
    const rp = t.closest('[data-rapport]'); if (rp) { const r = Z.rapporte.find((x) => x.id === rp.dataset.rapport); if (r) rapportZeigen(r); return; }
    const a = t.closest('[data-a]'); if (!a) return;
    const af = Z.offen && auftrag(Z.offen);
    switch (a.dataset.a) {
      case 'archiv': Z.archiv = !Z.archiv; zeichnen(); break;
      case 'neu': {
        const dlg = $('dlg');
        dlg.innerHTML = `<form class="dlg" method="dialog"><h3>Neues Projekt</h3>
          <label>Name<input name="name" required placeholder="z. B. Badsanierung Müller"></label>
          <label>Kunde<input name="kunde" autocomplete="organization"></label>
          <label>Adresse der Baustelle / des Einsatzes<input name="adresse" autocomplete="street-address"></label>
          <label>Budget in CHF <span class="hinweis">(freiwillig)</span><input name="budget" inputmode="decimal"></label>
          <label>Kostenstelle <span class="hinweis">(freiwillig)</span><input name="kst" list="kstNeu"><datalist id="kstNeu">${[...new Set(Z.auftraege.map((x) => x.kostenstelle).filter(Boolean))].map((k) => `<option value="${esc(k)}">`).join('')}</datalist></label>
          <p class="hinweis">Das Projekt erscheint auch in der Zeiterfassung und im Lager. Stunden und Material laufen automatisch hierher.</p>
          <div class="aktionen" style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" value="zu" formnovalidate>Abbrechen</button><button class="btn haupt" value="ok">Anlegen</button></div></form>`;
        dlg.showModal();
        dlg.onclose = async () => {
          if (dlg.returnValue !== 'ok') return; const f = dlg.querySelector('form');
          if (!f.name.value.trim()) return;
          const { data, error } = await sb.from('ze_auftraege').insert({ name: f.name.value.trim(), kunde: f.kunde.value.trim(), adresse: f.adresse.value.trim(), budget_rappen: betragLesen(f.budget.value), kostenstelle: f.kst.value.trim() || null }).select().single();
          if (error) { toast(fehlerText(error), 6000); return; }
          Z.auftraege.unshift(data); Z.offen = data.id; zeichnen(); toast('Projekt angelegt');
        };
        break;
      }
      case 'zurueck': Z.offen = null; zeichnen(); break;
      case 'bearbeiten': {
        const dlg = $('dlg');
        dlg.innerHTML = `<form class="dlg" method="dialog"><h3>${esc(af.name)}</h3>
          <label>Budget in CHF <span class="hinweis">(freiwillig)</span><input name="budget" inputmode="decimal" value="${af.budget_rappen ? (af.budget_rappen / 100).toFixed(2) : ''}" placeholder="z. B. 12000"></label>
          <label>Pauschalpreis in CHF <span class="hinweis">(statt nach Aufwand, freiwillig)</span><input name="pauschal" inputmode="decimal" value="${af.pauschal_rappen ? (af.pauschal_rappen / 100).toFixed(2) : ''}"></label>
          <label>Kostenstelle<input name="kst" list="kstListe" value="${esc(af.kostenstelle || '')}" placeholder="z. B. Sanitär, Filiale Luzern"><datalist id="kstListe">${[...new Set(Z.auftraege.map((x) => x.kostenstelle).filter(Boolean))].map((k) => `<option value="${esc(k)}">`).join('')}</datalist></label>
          <div class="aktionen" style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" value="zu">Abbrechen</button><button class="btn haupt" value="ok">Speichern</button></div></form>`;
        dlg.showModal();
        dlg.onclose = async () => {
          if (dlg.returnValue !== 'ok') return; const f = dlg.querySelector('form');
          const zeile = { budget_rappen: betragLesen(f.budget.value), pauschal_rappen: betragLesen(f.pauschal.value), kostenstelle: f.kst.value.trim() || null };
          const { error } = await sb.from('ze_auftraege').update(zeile).eq('id', af.id);
          if (error) { toast(fehlerText(error), 6000); return; }
          Object.assign(af, zeile); zeichnen(); toast('Gespeichert');
        };
        break;
      }
      case 'rapport': await rapportErstellen(af); break;
      case 'rechnung': {
        const pos = rapportPositionen(af);
        if (!await UI.frage(`${pos.length} ${pos.length === 1 ? 'Position' : 'Positionen'} (alles noch nicht Verrechnete) in eine neue Rechnung übernehmen?`, { ja: 'Rechnung erstellen', gefahr: false })) return;
        await inRechnung(pos, af.name, af.kunde, pos.filter((p) => p.art === 'stunden').flatMap((p) => p.ids), pos.filter((p) => p.art === 'material').flatMap((p) => p.ids));
        break;
      }
      case 'sigLeeren': { const c = $('sig'); if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.dataset.leer = '1'; } break; }
      case 'unterschreiben': {
        const c = $('sig'), name = ($('sigName') || {}).value || '';
        if (!c || c.dataset.leer) { toast('Bitte zuerst unterschreiben'); return; }
        if (!name.trim()) { toast('Bitte den Namen eintragen'); $('sigName').focus(); return; }
        // verkleinert speichern
        const k = document.createElement('canvas'); k.width = 600; k.height = Math.round(600 * c.height / c.width); k.getContext('2d').drawImage(c, 0, 0, k.width, k.height);
        const zeile = { unterschrift: k.toDataURL('image/png'), unterschrieben_von: name.trim(), unterschrieben_am: new Date().toISOString() };
        const { error } = await sb.from('pr_rapporte').update(zeile).eq('id', Z.rapport.id);
        if (error) { toast(fehlerText(error), 6000); return; }
        Object.assign(Z.rapport, zeile); rapportZeigen(Z.rapport); toast('✓ Unterschrift gespeichert');
        break;
      }
      case 'rpRechnung': {
        const r = Z.rapport, d = r.daten || {};
        const pos = d.positionen || [];
        if (!await UI.frage(`Rapport ${r.nummer} mit ${pos.length} Positionen in eine neue Rechnung übernehmen?${r.unterschrift ? '' : '\n\nDer Rapport ist noch nicht unterschrieben.'}`, { ja: 'Rechnung erstellen', gefahr: false })) return;
        await inRechnung(pos, d.projekt + ' · Rapport ' + r.nummer, d.kunde, pos.filter((p) => p.art === 'stunden').flatMap((p) => p.ids || []), pos.filter((p) => p.art === 'material').flatMap((p) => p.ids || []), r.id);
        break;
      }
      case 'drucken': { $('druck').innerHTML = $('rpBlatt').outerHTML; const c = $('sig'); if (c && !c.dataset.leer) { const img = document.createElement('img'); img.src = c.toDataURL(); img.className = 'unterschrift'; const z = $('druck').querySelector('canvas'); if (z) z.replaceWith(img); } $('dlg').close(); setTimeout(() => print(), 100); break; }
      case 'rpLoeschen': {
        if (!await UI.frage(`Rapport ${Z.rapport.nummer} löschen?`)) return;
        const { error } = await sb.from('pr_rapporte').delete().eq('id', Z.rapport.id);
        if (error) { toast(fehlerText(error), 6000); return; }
        Z.rapporte = Z.rapporte.filter((x) => x.id !== Z.rapport.id); $('dlg').close(); zeichnen(); toast('Gelöscht');
        break;
      }
    }
  });

  window.OrdasioZurueck = window.OrdasioZurueck || {};
  window.OrdasioZurueck.kannIntern = () => (Z.offen ? 'Projekte' : Z.tab !== 'projekte' ? 'Projekte' : false);
  window.OrdasioZurueck.intern = () => { if (Z.offen) { Z.offen = null; zeichnen(); return true; } if (Z.tab !== 'projekte') { Z.tab = 'projekte'; zeichnen(); return true; } return false; };
  zeichnen();
  (async function warten(n = 0) { const { data: { session } } = await sb.auth.getSession(); if (session) laden(); else if (n < 600) setTimeout(() => warten(n + 1), 500); })();
})();
