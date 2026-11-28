// Home-Büro: Haushalt und Briefkasten. Eine weitere Person im selben Haushalt wird gratis eingeladen.
// Gemeinsam sieht man die Post (Foto oder PDF, die KI liest Absender, Frist, Betrag) und geteilte Rechnungen:
// wer was bezahlt hat und was noch offen ist. Alles Übrige im Home-Büro bleibt privat bei jeder Person.
// Daten: Supabase (haushalte, haushalt_mitglieder, haushalt_einladungen, haushalt_eintraege, Speicher «haushalt»).
// Wird vor dem Hauptskript geladen und greift über window.HomeBuero zu.
(() => {
  'use strict';
  const H = (window.HomeBuero = window.HomeBuero || {});
  const sb = () => window.NASUVIA_SB;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chf = (r) => (H.chf ? H.chf(r) : ((r || 0) / 100).toFixed(2));
  const dk = (d) => (H.dk ? H.dk(d) : d);
  const heute = () => (H.heute ? H.heute() : new Date().toLocaleDateString('sv-SE'));
  const toast = (t) => (H.toast ? H.toast(t) : null);
  const dlg = () => document.getElementById('dlg');
  const istDatum = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '');

  const KAT = [['rechnung', 'Rechnung', 'm-blau'], ['mahnung', 'Mahnung', 'm-rot'], ['behoerde', 'Behörde', 'm-offen'], ['steuern', 'Steuern', 'm-offen'], ['bank', 'Bank', ''], ['versicherung', 'Versicherung', ''],
    ['krankenkasse', 'Krankenkasse', ''], ['wohnen', 'Wohnen', ''], ['arbeit', 'Arbeit', ''], ['schule', 'Schule', ''], ['paket', 'Paket', ''], ['privat', 'Privat', ''], ['werbung', 'Werbung', ''], ['andere', 'Andere', '']];
  const kat = (k) => KAT.find((x) => x[0] === k) || KAT[KAT.length - 1];

  // Zustand
  let info = null;          // Antwort von haushalt_info (null = noch nicht geladen)
  let liste = [];           // Einträge im Haushalt
  let geladen = false, laedt = false, fehler = '';
  let filter = 'offen';
  const urls = new Map();   // Pfad -> { url, bis }

  const online = () => !!(window.NASUVIA_KONFIG && NASUVIA_KONFIG.produkt && sb());
  const demo = () => !!window.NASUVIA_DEMO;
  const ich = () => (info && info.ich) || '';
  const hh = () => (info && info.haushalt) || null;
  const mitglieder = () => (info && info.mitglieder) || [];
  const nameVon = (id) => { const m = mitglieder().find((x) => x.user_id === id); return m ? m.name : ''; };
  const meinName = () => nameVon(ich()) || 'Ich';
  const istBesitzer = () => info && info.rolle === 'besitzer';
  const neu = (e) => !(e.gelesen || []).includes(ich()) && e.von !== ich();
  const offen = (e) => e.status === 'offen';
  const istRechnung = (e) => e.betrag_rappen != null && e.betrag_rappen > 0;
  const neuZeichnen = () => { if (H.zeichnen) H.zeichnen(); };
  const fehlerText = (e) => { const m = String((e && (e.message || e.error_description)) || e || ''); return m.replace(/^.*?:\s*/, '') || 'Das hat nicht geklappt.'; };

  async function rpc(name, args) {
    const { data, error } = await sb().rpc(name, args || {});
    if (error) throw new Error(error.message || 'Das hat nicht geklappt.');
    return data;
  }

  /* ---------- Laden ---------- */
  async function laden(still) {
    if (!online() || demo() || laedt) return;
    laedt = true;
    try {
      info = await rpc('haushalt_info');
      if (hh()) {
        const { data, error } = await sb().from('haushalt_eintraege').select('*').order('erstellt', { ascending: false }).limit(400);
        if (error) throw error;
        liste = data || [];
        abgleichen();
      } else liste = [];
      fehler = '';
    } catch (e) { fehler = fehlerText(e); }
    laedt = false; geladen = true;
    if (!still || ['briefkasten', 'haushalt', 'start'].includes(aktuelleAnsicht())) neuZeichnen();
  }
  const aktuelleAnsicht = () => { try { return new URLSearchParams(location.search).get('tab') || localStorage.getItem('homebuero.ansicht') || 'start'; } catch { return 'start'; } };

  // Rechnungen im eigenen Home-Büro, die im Haushalt geteilt sind: was dort bezahlt wurde, hier nachtragen
  function abgleichen() {
    const D = H.daten; if (!D || !D.rechnungen) return;
    let n = 0, wer = '';
    for (const r of D.rechnungen) {
      if (!r.haushaltId || r.status !== 'offen') continue;
      const e = liste.find((x) => x.id === r.haushaltId);
      if (e && e.status === 'bezahlt') { r.status = 'bezahlt'; r.bezahltAm = e.erledigt_am || heute(); n++; wer = e.erledigt_von_name || wer; }
    }
    if (n) { H.sichern && H.sichern(); toast(n === 1 ? `${wer || 'Jemand im Haushalt'} hat eine Rechnung bezahlt. Bei Ihnen ist sie jetzt als bezahlt eingetragen.` : `${n} Rechnungen wurden im Haushalt bezahlt und sind jetzt eingetragen.`); }
  }

  /* ---------- Dateien ---------- */
  async function signiert(pfad) {
    if (!pfad) return '';
    const c = urls.get(pfad); if (c && c.bis > Date.now()) return c.url;
    const { data, error } = await sb().storage.from('haushalt').createSignedUrl(pfad, 3600);
    if (error || !data) return '';
    urls.set(pfad, { url: data.signedUrl, bis: Date.now() + 50 * 60e3 });
    return data.signedUrl;
  }
  // Fotos von Briefen gut lesbar, aber klein genug zum Hochladen
  function bildVerkleinern(datei) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => { const m = Math.min(1, 1700 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * m); c.height = Math.round(img.height * m);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); c.toBlob((b) => ok(b || datei), 'image/jpeg', 0.8); };
      img.onerror = () => ok(datei); img.src = URL.createObjectURL(datei);
    });
  }
  async function hochladen(blob) {
    const typ = blob.type || 'application/octet-stream';
    if (!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(typ)) throw new Error('Bitte ein Foto oder ein PDF wählen.');
    if (blob.size > 8 * 1024 * 1024) throw new Error('Die Datei ist zu gross (max. 8 MB).');
    const pfad = `${hh().id}/${crypto.randomUUID()}.${typ === 'application/pdf' ? 'pdf' : typ.split('/')[1].replace('jpeg', 'jpg')}`;
    const { error } = await sb().storage.from('haushalt').upload(pfad, blob, { contentType: typ, upsert: false });
    if (error) throw new Error('Hochladen hat nicht geklappt. Bitte nochmals versuchen.');
    return { pfad, typ };
  }
  const ausDataUrl = async (u) => (await fetch(u)).blob();

  /* ---------- Ansicht: Briefkasten ---------- */
  function keinOnline() {
    if (demo()) return '<div class="card"><h2>Briefkasten</h2><p class="hinweis">In der Demo nicht verfügbar. Mit Ihrem eigenen Konto teilen Sie hier Post und Rechnungen mit Ihrem Haushalt.</p></div>';
    if (!online()) return '<div class="card"><h2>Briefkasten</h2><p class="hinweis">Den gemeinsamen Briefkasten gibt es mit Anmeldung.</p></div>';
    if (!geladen) { laden(true); return '<p class="leer">Wird geladen …</p>'; }
    if (fehler && !info) return `<div class="card"><h2>Briefkasten</h2><p class="hinweis">${esc(fehler)}</p><button class="btn" data-hh-neu-laden>Nochmals versuchen</button></div>`;
    return '';
  }
  function einrichten(titel) {
    return `<div class="kopf"><div><h1>${titel}</h1><p class="unter">Post und Rechnungen gemeinsam im Blick</p></div></div>
      <div class="card hh-einstieg"><div class="hh-symbol">${SYMBOL_HAUS}</div>
        <h2>Ihr Haushalt bei Ordasio</h2>
        <ul class="hh-punkte"><li><b>Briefkasten:</b> Post fotografieren, Ordasio liest Absender, Betrag und Frist. Alle im Haushalt sehen, was gekommen ist.</li>
          <li><b>Rechnungen teilen:</b> wer was bezahlt hat und was noch offen ist. Wird eine Rechnung bezahlt, bekommen die anderen eine Mitteilung.</li>
          <li><b>1 Person gratis:</b> Ihre Partnerin, Ihr Partner oder Mitbewohner bekommt das Home-Büro gratis dazu, mit eigenem Login.</li>
          <li><b>Privat bleibt privat:</b> Ihre Konten, Ihr Budget und Ihre Ordner sieht niemand. Geteilt wird nur, was im Briefkasten liegt.</li></ul>
        <button class="btn haupt" data-hh-erstellen>Haushalt erstellen</button>
        <p class="hinweis" style="margin:10px 0 0">Wurden Sie eingeladen? Öffnen Sie einfach den Link aus der Einladung.</p></div>`;
  }
  function briefkasten() {
    const k = keinOnline(); if (k) return k;
    if (!hh()) return einrichten('Briefkasten');
    const alle = liste;
    const zuTun = alle.filter(offen);
    const rg = alle.filter(istRechnung);
    const rgOffen = rg.filter(offen);
    const ueber = rgOffen.filter((e) => e.faellig && e.faellig < heute());
    const sicht = filter === 'offen' ? zuTun : filter === 'rechnungen' ? rg : alle;
    const zeile = (e) => {
      const kk = kat(e.kategorie), t = e.faellig ? (H.tageBis ? H.tageBis(e.faellig) : 0) : null;
      const st = e.status === 'bezahlt' ? '<span class="marke-s m-ok">bezahlt</span>' : e.status === 'erledigt' ? '<span class="marke-s m-ok">erledigt</span>'
        : t !== null && t < 0 && istRechnung(e) ? '<span class="marke-s m-rot">überfällig</span>' : '';
      const wer = e.status !== 'offen' && e.erledigt_von_name ? ` · ${e.status === 'bezahlt' ? 'bezahlt' : 'erledigt'} von ${esc(e.erledigt_von_name)}` : '';
      const fuer = e.fuer ? ` · für ${esc(e.fuer === ich() ? 'Sie' : nameVon(e.fuer) || '…')}` : '';
      return `<div class="zeile klick hh-zeile ${neu(e) ? 'hh-neu' : ''}" data-hh-eintrag="${e.id}"><span style="min-width:0"><b>${neu(e) ? '<i class="hh-punkt"></i>' : ''}${esc(e.titel || e.absender || 'Brief')}<span class="marke-s ${kk[2]}">${kk[1]}</span>${st}</b>
        <small>${esc(e.absender || '')}${e.absender ? ' · ' : ''}${e.von === ich() ? 'von Ihnen' : 'von ' + esc(e.von_name || nameVon(e.von) || '…')} am ${dk(String(e.erstellt).slice(0, 10))}${fuer}${e.status === 'offen' && e.faellig ? ` · <span class="${t !== null && t < 0 ? 'minus' : ''}">Frist ${dk(e.faellig)}${t !== null ? (t < 0 ? ` (seit ${-t} Tagen)` : t === 0 ? ' (heute)' : ` (in ${t} Tagen)`) : ''}</span>` : ''}${wer}${(e.notizen || []).length ? ` · ${(e.notizen || []).length} Notiz${(e.notizen || []).length > 1 ? 'en' : ''}` : ''}</small></span>
        ${istRechnung(e) ? `<span class="betrag">${chf(e.betrag_rappen)}</span>` : ''}</div>`;
    };
    return `<div class="kopf"><div><h1>Briefkasten</h1><p class="unter">${esc(hh().name)} · ${mitglieder().map((m) => esc(m.user_id === ich() ? 'Sie' : m.name)).join(', ')}</p></div>
        <div class="aktionen"><button class="btn haupt" data-hh-post>+ Post erfassen</button><button class="btn" data-hh-rg-teilen>Rechnung teilen</button></div></div>
      <div class="raster r4"><div class="card zahl klick" data-hh-filter="offen"><div class="l">Zu erledigen</div><div class="w">${zuTun.length}</div><div class="k">${alle.filter(neu).length} neu für Sie</div></div>
        <div class="card zahl klick" data-hh-filter="rechnungen"><div class="l">Offene Rechnungen</div><div class="w">${chf(rgOffen.reduce((a, e) => a + Number(e.betrag_rappen || 0), 0))}</div><div class="k">${rgOffen.length} Rechnungen</div></div>
        <div class="card zahl klick" data-hh-filter="rechnungen"><div class="l">Überfällig</div><div class="w ${ueber.length ? 'minus' : ''}">${chf(ueber.reduce((a, e) => a + Number(e.betrag_rappen || 0), 0))}</div><div class="k">${ueber.length} Rechnungen</div></div>
        <div class="card zahl klick" data-hh-filter="alle"><div class="l">Bezahlt ${new Date().getFullYear()}</div><div class="w plus">${chf(rg.filter((e) => e.status === 'bezahlt' && String(e.erledigt_am || '').startsWith(String(new Date().getFullYear()))).reduce((a, e) => a + Number(e.betrag_rappen || 0), 0))}</div><div class="k">im Haushalt</div></div></div>
      <div class="segment" style="margin:16px 0 0">${[['offen', 'Zu erledigen'], ['rechnungen', 'Rechnungen'], ['alle', 'Alles']].map(([id, n]) => `<button class="${filter === id ? 'an' : ''}" data-hh-filter="${id}">${n}</button>`).join('')}</div>
      <div class="card abstand">${sicht.map(zeile).join('') || `<p class="leer">${filter === 'offen' ? 'Nichts zu erledigen. Neue Post fotografieren Sie mit «+ Post erfassen».' : 'Noch nichts im Briefkasten.'}</p>`}</div>
      ${fehler ? `<p class="hinweis">${esc(fehler)}</p>` : ''}`;
  }

  /* ---------- Ansicht: Personen im Haushalt ---------- */
  function personen() {
    const k = keinOnline(); if (k) return k.replace(/Briefkasten/g, 'Haushalt');
    if (!hh()) return einrichten('Haushalt');
    const h = hh(), m = mitglieder(), ein = (info && info.einladungen) || [];
    const frei = Math.max(0, h.plaetze - m.length - ein.length);
    return `<div class="kopf"><div><h1>${esc(h.name)}</h1><p class="unter">${m.length} ${m.length === 1 ? 'Person' : 'Personen'} · Briefkasten und Rechnungen gemeinsam</p></div>
        ${istBesitzer() ? '<div class="aktionen"><button class="btn" data-hh-umbenennen>Umbenennen</button></div>' : ''}</div>
      <div class="card"><h2>Personen</h2>${m.map((p) => `<div class="zeile"><span style="min-width:0"><b>${esc(p.name)}${p.user_id === ich() ? ' (Sie)' : ''}<span class="marke-s ${p.rolle === 'besitzer' ? 'm-blau' : 'm-ok'}">${p.rolle === 'besitzer' ? 'hat das Abo' : 'gratis dabei'}</span></b><small>${esc(p.email)} · seit ${dk(String(p.seit).slice(0, 10))}</small></span>
          ${p.rolle === 'mitglied' && (istBesitzer() || p.user_id === ich()) ? `<button class="btn klein rot" data-hh-austreten="${p.user_id}">${p.user_id === ich() ? 'Austreten' : 'Entfernen'}</button>` : ''}</div>`).join('')}
        ${ein.map((e) => `<div class="zeile"><span style="min-width:0"><b>${esc(e.name || 'Eingeladene Person')}<span class="marke-s m-offen">eingeladen</span></b><small>Link gültig bis ${dk(String(e.bis).slice(0, 10))}</small></span>
          <span class="aktionen"><button class="btn klein" data-hh-link="${esc(e.code)}" data-name="${esc(e.name)}">Link</button><button class="btn klein rot" data-hh-zurueck="${esc(e.code)}">Zurückziehen</button></span></div>`).join('')}
        ${istBesitzer() ? (frei ? `<div style="margin-top:12px"><button class="btn haupt" data-hh-einladen>Person gratis einladen</button><p class="hinweis" style="margin:8px 0 0">Noch ${frei} ${frei === 1 ? 'Platz' : 'Plätze'} frei. Die Person bekommt ein eigenes Login und das Home-Büro gratis, solange sie in Ihrem Haushalt ist.</p></div>`
          : '<p class="hinweis" style="margin:12px 0 0">Alle Plätze im Haushalt sind vergeben.</p>') : ''}</div>
      <div class="card abstand"><h2>Was geteilt wird</h2>
        <ul class="hh-punkte"><li>Alles im <b>Briefkasten</b>: Briefe, Fotos, PDFs, Notizen und wer was bezahlt oder erledigt hat.</li>
          <li><b>Rechnungen</b>, die jemand ausdrücklich teilt (in der Rechnung: «Im Haushalt teilen»).</li>
          <li><b>Nicht geteilt</b> werden Konten, Budget, Abos, Steuern, Ordner und alles andere im Home-Büro. Das bleibt bei jeder Person privat.</li></ul>
        <p class="hinweis" style="margin:8px 0 0">Mitteilungen dazu schalten Sie unter Einstellungen, Benachrichtigungen, «Haushalt und Briefkasten» ein oder aus.</p></div>`;
  }

  /* ---------- Startseite ---------- */
  const altStart = H.startExtra;
  H.startExtra = (S) => {
    let karte = '';
    if (hh() && liste.length) {
      const n = liste.filter(neu), o = liste.filter((e) => offen(e) && istRechnung(e));
      if (n.length || o.length) karte = `<div class="card klick abstand hh-start" data-tab="briefkasten"><h2>Briefkasten</h2>
        ${n.length ? `<p style="margin:0 0 6px"><b>${n.length} ${n.length === 1 ? 'neuer Eintrag' : 'neue Einträge'}</b>: ${n.slice(0, 3).map((e) => esc(e.titel || e.absender || 'Brief')).join(', ')}${n.length > 3 ? ' …' : ''}</p>` : ''}
        ${o.length ? `<p class="hinweis" style="margin:0">${o.length} offene ${o.length === 1 ? 'Rechnung' : 'Rechnungen'} im Haushalt · ${chf(o.reduce((a, e) => a + Number(e.betrag_rappen || 0), 0))}</p>` : ''}</div>`;
    }
    return karte + (altStart ? altStart(S) : '');
  };
  const altDringend = H.dringendExtra;
  H.dringendExtra = () => {
    const l = altDringend ? altDringend() : [];
    for (const e of liste) if (offen(e) && e.faellig && H.tageBis && H.tageBis(e.faellig) <= 3 && !(H.daten && H.daten.rechnungen || []).some((r) => r.haushaltId === e.id))
      l.push({ t: `Haushalt: ${e.titel || e.absender || 'Brief'}${istRechnung(e) ? ' ' + chf(e.betrag_rappen) : ''}`, d: e.faellig, k: 'briefkasten' });
    return l;
  };

  /* ---------- Haushalt erstellen, einladen, austreten ---------- */
  async function erstellen() {
    try { info = await rpc('haushalt_erstellen', { p_name: '' }); liste = []; geladen = true; neuZeichnen(); toast('Haushalt erstellt'); einladen(); }
    catch (e) { toast(fehlerText(e)); }
  }
  async function einladen() {
    const f = await formular('Person gratis einladen', `<p class="hinweis" style="margin-top:0">Sie bekommen einen Link, den Sie per WhatsApp, SMS oder E-Mail schicken. Die Person erstellt damit ihr eigenes Konto und ist danach in Ihrem Haushalt.</p>
      <label>Vorname der Person <span class="hinweis">(freiwillig, nur für Sie)</span><input name="name" maxlength="60" placeholder="z. B. Sara"></label>`, 'Link erstellen');
    if (!f) return;
    try { const code = await rpc('haushalt_einladen', { p_name: f.get('name') || '' }); await laden(true); linkZeigen(code, f.get('name') || ''); }
    catch (e) { toast(fehlerText(e)); }
  }
  function linkZeigen(code, name) {
    const link = new URL('?haushalt=' + encodeURIComponent(code) + '&neu=1', location.origin + location.pathname).href;
    const text = `${name ? 'Hallo ' + name + ', ' : ''}ich lade dich in unseren Haushalt bei Ordasio ein. Dort sehen wir zusammen die Post und wer welche Rechnung bezahlt hat. Für dich ist es gratis: ${link}`;
    const d = dlg();
    d.onchange = null; d.onsubmit = null;
    d.innerHTML = `<form class="dlg" method="dialog"><h3>Einladung verschicken</h3>
      <p class="hinweis" style="margin-top:0">Der Link ist 14 Tage gültig und kann einmal benutzt werden.</p>
      <label>Link<input readonly value="${esc(link)}" data-hh-feld></label>
      <div class="hh-teilen">${navigator.share ? '<button type="button" class="btn haupt" data-hh-share>Teilen …</button>' : ''}
        <a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn" href="sms:?&body=${encodeURIComponent(text)}">SMS</a>
        <a class="btn" href="mailto:?subject=${encodeURIComponent('Einladung in unseren Haushalt bei Ordasio')}&body=${encodeURIComponent(text)}">E-Mail</a>
        <button type="button" class="btn" data-hh-kopieren>Link kopieren</button></div>
      <div class="fuss"><span></span><button class="btn" data-zu>Fertig</button></div></form>`;
    d.onclick = async (e) => {
      if (e.target === d || e.target.closest('[data-zu]')) { e.preventDefault(); d.close(); neuZeichnen(); }
      if (e.target.closest('[data-hh-share]')) { try { await navigator.share({ title: 'Einladung in unseren Haushalt', text, url: link }); } catch {} }
      if (e.target.closest('[data-hh-kopieren]')) { try { await navigator.clipboard.writeText(link); toast('Link kopiert'); } catch { const i = d.querySelector('[data-hh-feld]'); i.select(); document.execCommand && document.execCommand('copy'); toast('Link kopiert'); } }
    };
    if (!d.open) d.showModal();
  }
  async function austreten(uid) {
    const selbst = uid === ich();
    const ok = window.UI && UI.frage ? await UI.frage(selbst ? 'Aus dem Haushalt austreten? Sie sehen den Briefkasten danach nicht mehr. Ihr eigenes Home-Büro bleibt erhalten, Sie haben 14 Tage Zeit, um ein eigenes Abo zu lösen.'
      : `${nameVon(uid)} aus dem Haushalt entfernen? Die Person sieht den Briefkasten danach nicht mehr. Ihr eigenes Home-Büro bleibt erhalten.`, { ja: selbst ? 'Austreten' : 'Entfernen', gefahr: true }) : confirm('Sicher?');
    if (!ok) return;
    try { await rpc('haushalt_austreten', { p_user: uid }); toast(selbst ? 'Sie sind ausgetreten' : 'Entfernt'); await laden(); }
    catch (e) { toast(fehlerText(e)); }
  }

  /* ---------- Post erfassen ---------- */
  function katOptionen(g) { return KAT.map(([k, n]) => `<option value="${k}" ${k === g ? 'selected' : ''}>${n}</option>`).join(''); }
  function fuerOptionen(g) { return `<option value="">Alle im Haushalt</option>${mitglieder().map((m) => `<option value="${m.user_id}" ${m.user_id === g ? 'selected' : ''}>${esc(m.user_id === ich() ? 'Mich' : m.name)}</option>`).join('')}`; }
  function postErfassen() {
    const e = { kategorie: 'andere', titel: '', absender: '', zusammenfassung: '', handlung: '', faellig: '', betrag: '', iban: '', referenz: '', fuer: '' };
    let datei = null, vorschau = '';
    const d = dlg();
    const zeigen = (status = '') => {
      d.innerHTML = `<form class="dlg" method="dialog"><h3>Post erfassen</h3>
        <label class="hh-foto">${vorschau ? (datei && datei.type === 'application/pdf' ? '<span class="hh-pdf">PDF gewählt</span>' : `<img src="${vorschau}" alt="Brief">`) : `${SYMBOL_KAMERA}<b>Foto machen oder Datei wählen</b><small>Brief, Rechnung, Mahnung, auch als PDF</small>`}
          <input type="file" accept="image/*,application/pdf" data-hh-datei hidden></label>
        ${status ? `<p class="hinweis hh-status">${status}</p>` : ''}
        <div class="zwei"><label>Art<select name="kategorie">${katOptionen(e.kategorie)}</select></label><label>Für<select name="fuer">${fuerOptionen(e.fuer)}</select></label></div>
        <div class="zwei"><label>Von (Absender)<input name="absender" value="${esc(e.absender)}" placeholder="z. B. Steueramt"></label><label>Worum es geht<input name="titel" value="${esc(e.titel)}" placeholder="z. B. Provisorische Steuerrechnung"></label></div>
        <label>Kurz zusammengefasst<textarea name="zusammenfassung" rows="2">${esc(e.zusammenfassung)}</textarea></label>
        <label>Was zu tun ist<input name="handlung" value="${esc(e.handlung)}" placeholder="z. B. bis 31.12. bezahlen"></label>
        <div class="zwei"><label>Frist<input type="date" name="faellig" value="${esc(e.faellig)}"></label><label>Betrag CHF <span class="hinweis">(falls zu bezahlen)</span><input name="betrag" inputmode="decimal" value="${esc(e.betrag)}"></label></div>
        <div class="zwei"><label>IBAN<input name="iban" value="${esc(e.iban)}"></label><label>Referenz<input name="referenz" value="${esc(e.referenz)}"></label></div>
        <div class="fuss"><span></span><span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt" data-hh-speichern>In den Briefkasten</button></span></div></form>`;
      d.querySelector('form').onsubmit = (ev) => absenden(ev);
      if (!d.open) d.showModal();
    };
    const merken = () => { const f = new FormData(d.querySelector('form')); for (const k of Object.keys(e)) if (f.has(k)) e[k] = String(f.get(k) || '').trim(); };
    d.onclick = (ev) => { if (ev.target === d || ev.target.closest('[data-zu]')) { ev.preventDefault(); d.close(); } };
    d.onchange = async (ev) => {
      if (!ev.target.matches('[data-hh-datei]')) return;
      const f = ev.target.files[0]; if (!f) return;
      merken();
      datei = f.type.startsWith('image/') ? await bildVerkleinern(f) : f;
      vorschau = f.type.startsWith('image/') ? URL.createObjectURL(datei) : 'pdf';
      zeigen('Wird gelesen …');
      let r = null; try { r = window.Leser && Leser.ki ? await Leser.ki(datei, 'brief') : null; } catch { r = null; }
      if (!d.open || !d.querySelector('[data-hh-speichern]')) return;
      merken();
      const v = (r && r.felder) || {};
      if (v.kategorie && KAT.some((x) => x[0] === v.kategorie) && e.kategorie === 'andere') e.kategorie = v.kategorie;
      e.absender = e.absender || v.absender || ''; e.titel = e.titel || v.betreff || '';
      e.zusammenfassung = e.zusammenfassung || v.zusammenfassung || ''; e.handlung = e.handlung || v.handlung || '';
      if (!e.faellig && istDatum(v.frist)) e.faellig = v.frist;
      if (!e.betrag && Number(v.betrag) > 0) e.betrag = Number(v.betrag).toFixed(2);
      e.iban = e.iban || v.iban || ''; e.referenz = e.referenz || v.referenz || '';
      if (!e.fuer && v.empfaenger) { const m = mitglieder().find((x) => x.name && String(v.empfaenger).toLowerCase().includes(x.name.toLowerCase())); if (m && mitglieder().length > 1) e.fuer = m.user_id; }
      zeigen(r && r.felder ? 'Gelesen. Bitte kurz prüfen.' : r && r.fehler ? esc(r.fehler) + ' Sie können die Angaben selbst eintragen.' : 'Automatisch lesen ging nicht. Sie können die Angaben selbst eintragen.');
    };
    const absenden = async (ev) => {      ev.preventDefault();
      merken();
      const knopf = d.querySelector('[data-hh-speichern]'); if (knopf) { knopf.disabled = true; knopf.textContent = 'Wird gespeichert …'; }
      try {
        if (!datei && !e.titel && !e.absender) throw new Error('Bitte ein Foto wählen oder angeben, worum es geht.');
        const b = e.betrag ? (H.betragLesen ? H.betragLesen(e.betrag) : Math.round(Number(e.betrag) * 100)) : null;
        const up = datei ? await hochladen(datei) : null;
        const zeile = { haushalt_id: hh().id, art: 'post', von: ich(), von_name: meinName(), kategorie: e.kategorie, titel: e.titel.slice(0, 120), absender: e.absender.slice(0, 120),
          zusammenfassung: e.zusammenfassung.slice(0, 600), handlung: e.handlung.slice(0, 200), faellig: istDatum(e.faellig) ? e.faellig : null,
          betrag_rappen: Number.isFinite(b) && b > 0 ? b : null, iban: e.iban.slice(0, 40), referenz: e.referenz.slice(0, 40), fuer: e.fuer || null,
          status: e.kategorie === 'werbung' ? 'erledigt' : 'offen', datei_pfad: up ? up.pfad : null, datei_typ: up ? up.typ : null, gelesen: [ich()] };
        const { data, error } = await sb().from('haushalt_eintraege').insert(zeile).select().single();
        if (error) throw new Error(error.message);
        liste.unshift(data); d.close(); filter = 'offen'; neuZeichnen(); toast('Im Briefkasten. Die anderen im Haushalt sehen es.');
      } catch (err) { toast(fehlerText(err)); if (knopf) { knopf.disabled = false; knopf.textContent = 'In den Briefkasten'; } }
    };
    d.onsubmit = null;
    zeigen();
  }

  /* ---------- Rechnung aus dem Home-Büro teilen ---------- */
  async function rechnungTeilen(r) {
    if (!hh()) { toast('Erstellen Sie zuerst einen Haushalt'); return null; }
    let up = null;
    if (r.datei && /^data:(image\/|application\/pdf)/.test(r.datei)) { try { up = await hochladen(await ausDataUrl(r.datei)); } catch { up = null; } }
    const zeile = { haushalt_id: hh().id, art: 'rechnung', von: ich(), von_name: meinName(), quelle_id: r.id, kategorie: r.mahnstufe ? 'mahnung' : 'rechnung',
      titel: (r.titel || r.glaeubiger || 'Rechnung').slice(0, 120), absender: (r.glaeubiger || '').slice(0, 120), zusammenfassung: (r.notiz || '').slice(0, 600),
      betrag_rappen: r.betragRappen || null, faellig: istDatum(r.faellig) ? r.faellig : null, status: r.status === 'bezahlt' ? 'bezahlt' : 'offen',
      erledigt_von: r.status === 'bezahlt' ? ich() : null, erledigt_von_name: r.status === 'bezahlt' ? meinName() : '', erledigt_am: r.status === 'bezahlt' ? (r.bezahltAm || heute()) : null,
      datei_pfad: up ? up.pfad : null, datei_typ: up ? up.typ : null, gelesen: [ich()] };
    const { data, error } = await sb().from('haushalt_eintraege').insert(zeile).select().single();
    if (error) { toast(fehlerText(error)); return null; }
    liste.unshift(data); r.haushaltId = data.id; H.sichern && H.sichern();
    return data;
  }
  function rechnungWaehlen() {
    const D = H.daten || {}; const l = (D.rechnungen || []).filter((r) => !r.haushaltId).sort((a, b) => (a.status === b.status ? (a.faellig || '9').localeCompare(b.faellig || '9') : a.status === 'offen' ? -1 : 1));
    const d = dlg(); d.onchange = null; d.onsubmit = null;
    d.innerHTML = `<form class="dlg" method="dialog"><h3>Rechnung im Haushalt teilen</h3>
      <p class="hinweis" style="margin-top:0">Wählen Sie eine Rechnung aus Ihrem Home-Büro. Die anderen sehen Betrag, Frist und Foto, und wer sie bezahlt. Neue Post erfassen Sie direkt mit «+ Post erfassen».</p>
      ${l.length ? l.slice(0, 60).map((r) => `<div class="zeile klick" data-hh-wahl="${esc(r.id)}"><span style="min-width:0"><b>${esc(r.titel || r.glaeubiger || 'Rechnung')}${r.status === 'bezahlt' ? '<span class="marke-s m-ok">bezahlt</span>' : '<span class="marke-s m-offen">offen</span>'}</b><small>${esc(r.glaeubiger || '')}${r.faellig ? ' · fällig ' + dk(r.faellig) : ''}</small></span><span class="betrag">${chf(r.betragRappen)}</span></div>`).join('')
        : '<p class="leer">Alle Rechnungen sind schon geteilt, oder es sind noch keine erfasst.</p>'}
      <div class="fuss"><span></span><button class="btn" data-zu>Schliessen</button></div></form>`;
    d.onclick = async (e) => {
      if (e.target === d || e.target.closest('[data-zu]')) { e.preventDefault(); d.close(); return; }
      const w = e.target.closest('[data-hh-wahl]'); if (!w) return;
      const r = l.find((x) => x.id === w.dataset.hhWahl); if (!r) return;
      w.style.opacity = '.5';
      if (await rechnungTeilen(r)) { d.close(); neuZeichnen(); toast('Geteilt'); }
    };
    if (!d.open) d.showModal();
  }
  // Für den Rechnungs-Dialog im Home-Büro
  H.haushaltKnopf = (r) => {
    if (!hh() || !r) return '';
    if (r.haushaltId) return `<p class="hinweis" style="margin:0">Im Haushalt geteilt. Änderungen am Status sehen die anderen. <button type="button" class="btn klein" data-tab="briefkasten" data-zu>Zum Briefkasten</button></p>`;
    return `<div class="aktionen"><button type="button" class="btn klein" data-hh-teilen-r="${esc(r.id)}">Im Haushalt teilen</button><span class="hinweis">Die anderen sehen Betrag, Frist und wer bezahlt.</span></div>`;
  };
  H.haushaltRechnungGeaendert = async (r) => {
    if (!r || !r.haushaltId || !online()) return;
    const e = liste.find((x) => x.id === r.haushaltId);
    const neuSt = r.status === 'bezahlt' ? 'bezahlt' : 'offen';
    const z = { titel: (r.titel || r.glaeubiger || 'Rechnung').slice(0, 120), absender: (r.glaeubiger || '').slice(0, 120), betrag_rappen: r.betragRappen || null, faellig: istDatum(r.faellig) ? r.faellig : null };
    if (!e || e.status !== neuSt) Object.assign(z, { status: neuSt, erledigt_von: neuSt === 'bezahlt' ? ich() : null, erledigt_von_name: neuSt === 'bezahlt' ? meinName() : '', erledigt_am: neuSt === 'bezahlt' ? (r.bezahltAm || heute()) : null });
    const { data } = await sb().from('haushalt_eintraege').update(z).eq('id', r.haushaltId).select().maybeSingle();
    if (data) { const i = liste.findIndex((x) => x.id === data.id); if (i >= 0) liste[i] = data; }
  };

  /* ---------- Eintrag ansehen ---------- */
  async function aendern(e, z) {
    const { data, error } = await sb().from('haushalt_eintraege').update(z).eq('id', e.id).select().maybeSingle();
    if (error || !data) throw new Error((error && error.message) || 'Das hat nicht geklappt. Vielleicht wurde der Eintrag gelöscht.');
    const i = liste.findIndex((x) => x.id === data.id); if (i >= 0) liste[i] = data;
    return data;
  }
  async function oeffnen(id) {
    let e = liste.find((x) => x.id === id); if (!e) return;
    if (neu(e)) { try { e = await aendern(e, { gelesen: [...new Set([...(e.gelesen || []), ich()])] }); } catch {} }
    const d = dlg(); d.onchange = null; d.onsubmit = null;
    const lokal = (H.daten && H.daten.rechnungen || []).find((r) => r.haushaltId === e.id);
    const darfLoeschen = e.von === ich() || istBesitzer();
    const kk = kat(e.kategorie);
    const zeile = (l, w, kopieren) => (w ? `<div class="hh-zeile-k"><span>${l}</span><b>${esc(w)}</b>${kopieren ? `<button type="button" class="btn klein" data-hh-kopie="${esc(w)}">Kopieren</button>` : ''}</div>` : '');
    d.innerHTML = `<form class="dlg" method="dialog"><h3>${esc(e.titel || e.absender || 'Brief')}</h3>
      <p class="hinweis" style="margin-top:0"><span class="marke-s ${kk[2]}">${kk[1]}</span> ${e.von === ich() ? 'von Ihnen' : 'von ' + esc(e.von_name)} am ${dk(String(e.erstellt).slice(0, 10))}${e.status !== 'offen' ? ` · ${e.status === 'bezahlt' ? 'bezahlt' : 'erledigt'}${e.erledigt_von_name ? ' von ' + esc(e.erledigt_von_name) : ''}${e.erledigt_am ? ' am ' + dk(e.erledigt_am) : ''}` : ''}</p>
      <div class="hh-bild" data-hh-bild>${e.datei_pfad ? '<span class="hinweis">Foto wird geladen …</span>' : ''}</div>
      ${e.zusammenfassung ? `<p style="margin:0 0 10px">${esc(e.zusammenfassung)}</p>` : ''}
      ${e.handlung && e.status === 'offen' ? `<p class="hh-tun"><b>Zu tun:</b> ${esc(e.handlung)}</p>` : ''}
      <div class="hh-fakten">${zeile('Von', e.absender)}${istRechnung(e) ? zeile('Betrag', 'CHF ' + chf(e.betrag_rappen)) : ''}${e.faellig ? zeile('Frist', dk(e.faellig)) : ''}${zeile('IBAN', e.iban, true)}${zeile('Referenz', e.referenz, true)}</div>
      <div class="zwei"><label>Für<select data-hh-fuer>${fuerOptionen(e.fuer || '')}</select></label><label>Art<select data-hh-kat>${katOptionen(e.kategorie)}</select></label></div>
      <div class="hh-notizen"><b>Notizen</b>${(e.notizen || []).map((n) => `<div class="hh-notiz"><small>${esc(n.name)} · ${dk(String(n.am).slice(0, 10))}</small>${esc(n.text)}</div>`).join('') || '<p class="hinweis" style="margin:4px 0">Noch keine. Z. B. «Ich rufe morgen an» oder «Bezahlt per E-Banking».</p>'}
        <div class="hh-notiz-neu"><input data-hh-notiz maxlength="300" placeholder="Notiz für den Haushalt"><button type="button" class="btn klein" data-hh-notiz-ok>Senden</button></div></div>
      <div class="aktionen" style="margin-top:12px">${e.status === 'offen' ? (istRechnung(e) ? '<button type="button" class="btn haupt" data-hh-status="bezahlt">Ich habe bezahlt</button>' : '') + '<button type="button" class="btn' + (istRechnung(e) ? '' : ' haupt') + '" data-hh-status="erledigt">Erledigt</button>' : '<button type="button" class="btn" data-hh-status="offen">Wieder offen</button>'}
        ${istRechnung(e) && !lokal && (e.von !== ich() || !e.quelle_id) ? '<button type="button" class="btn" data-hh-uebernehmen>In mein Home-Büro</button>' : ''}</div>
      <div class="fuss">${darfLoeschen ? '<button type="button" class="btn rot" data-hh-loeschen>Löschen</button>' : '<span></span>'}<button class="btn" data-zu>Schliessen</button></div></form>`;
    d.querySelector('form').onsubmit = (ev) => { ev.preventDefault(); const k = d.querySelector('[data-hh-notiz-ok]'); if (k && (d.querySelector('[data-hh-notiz]') || {}).value) k.click(); };
    if (!d.open) d.showModal();
    if (e.datei_pfad) signiert(e.datei_pfad).then((u) => { const b = d.querySelector('[data-hh-bild]'); if (!b) return;
      b.innerHTML = !u ? '<span class="hinweis">Datei nicht verfügbar.</span>' : e.datei_typ === 'application/pdf' ? `<a class="btn klein" href="${esc(u)}" target="_blank" rel="noopener">PDF öffnen</a>` : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Brief"></a>`; });
    const nochmal = () => { neuZeichnen(); oeffnen(e.id); };
    d.onchange = async (ev) => {
      try {
        if (ev.target.matches('[data-hh-fuer]')) { e = await aendern(e, { fuer: ev.target.value || null }); neuZeichnen(); }
        if (ev.target.matches('[data-hh-kat]')) { e = await aendern(e, { kategorie: ev.target.value }); nochmal(); }
      } catch (err) { toast(fehlerText(err)); }
    };
    d.onclick = async (ev) => {
      const t = ev.target;
      if (t === d || t.closest('[data-zu]')) { ev.preventDefault(); d.close(); return; }
      try {
        const kp = t.closest('[data-hh-kopie]'); if (kp) { try { await navigator.clipboard.writeText(kp.dataset.hhKopie.replace(/\s+/g, kp.dataset.hhKopie.length > 30 ? '' : ' ')); toast('Kopiert'); } catch { toast(kp.dataset.hhKopie); } return; }
        const st = t.closest('[data-hh-status]');
        if (st) {
          const s = st.dataset.hhStatus;
          e = await aendern(e, s === 'offen' ? { status: 'offen', erledigt_von: null, erledigt_von_name: '', erledigt_am: null } : { status: s, erledigt_von: ich(), erledigt_von_name: meinName(), erledigt_am: heute() });
          if (lokal && s !== 'erledigt') { lokal.status = s === 'bezahlt' ? 'bezahlt' : 'offen'; lokal.bezahltAm = s === 'bezahlt' ? heute() : ''; H.sichern && H.sichern(); }
          toast(s === 'bezahlt' ? 'Als bezahlt eingetragen. Die anderen sehen es.' : s === 'erledigt' ? 'Erledigt' : 'Wieder offen');
          if (s !== 'offen') { d.close(); neuZeichnen(); } else nochmal();
          return;
        }
        if (t.closest('[data-hh-notiz-ok]')) {
          const i = d.querySelector('[data-hh-notiz]'); const text = (i.value || '').trim(); if (!text) return;
          const { data: frisch } = await sb().from('haushalt_eintraege').select('notizen').eq('id', e.id).maybeSingle();
          e = await aendern(e, { notizen: [...((frisch && frisch.notizen) || e.notizen || []), { von: ich(), name: meinName(), text: text.slice(0, 300), am: new Date().toISOString() }].slice(-50) });
          nochmal(); return;
        }
        if (t.closest('[data-hh-uebernehmen]')) {
          const r = { id: H.neueId ? H.neueId() : crypto.randomUUID(), titel: e.titel, glaeubiger: e.absender, betragRappen: Number(e.betrag_rappen) || 0, erhalten: String(e.erstellt).slice(0, 10), faellig: e.faellig || '',
            status: e.status === 'bezahlt' ? 'bezahlt' : 'offen', bezahltAm: e.status === 'bezahlt' ? (e.erledigt_am || heute()) : '', notiz: [e.zusammenfassung, e.referenz ? 'Referenz ' + e.referenz : '', e.iban ? 'IBAN ' + e.iban : ''].filter(Boolean).join(' · '), haushaltId: e.id };
          if (e.datei_pfad && e.datei_typ !== 'application/pdf') { try { const u = await signiert(e.datei_pfad); const b = await (await fetch(u)).blob(); r.datei = H.bildKlein ? await H.bildKlein(b) : ''; } catch {} }
          H.daten.rechnungen.push(r); H.sichern && H.sichern(); toast('In Ihren Rechnungen eingetragen'); nochmal(); return;
        }
        if (t.closest('[data-hh-loeschen]')) {
          const ok = window.UI && UI.frage ? await UI.frage('Diesen Eintrag für alle im Haushalt löschen?', { ja: 'Löschen', gefahr: true }) : confirm('Löschen?');
          if (!ok) { if (!d.open) oeffnen(e.id); return; }
          const { error } = await sb().from('haushalt_eintraege').delete().eq('id', e.id);
          if (error) throw new Error(error.message);
          if (e.datei_pfad) sb().storage.from('haushalt').remove([e.datei_pfad]).catch(() => {});
          liste = liste.filter((x) => x.id !== e.id);
          for (const r of (H.daten && H.daten.rechnungen) || []) if (r.haushaltId === e.id) delete r.haushaltId;
          H.sichern && H.sichern(); if (d.open) d.close(); neuZeichnen(); toast('Gelöscht');
        }
      } catch (err) { toast(fehlerText(err)); }
    };
  }

  /* ---------- Kleines Formular (Vorname, Name des Haushalts) ---------- */
  function formular(titel, inhalt, knopf) {
    return new Promise((fertig) => {
      const d = dlg(); d.onchange = null;
      d.innerHTML = `<form class="dlg" method="dialog"><h3>${titel}</h3>${inhalt}<div class="fuss"><span></span><span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt">${knopf}</button></span></div></form>`;
      let erledigt = false;
      d.onclick = (e) => { if (e.target === d || e.target.closest('[data-zu]')) { e.preventDefault(); d.close(); if (!erledigt) { erledigt = true; fertig(null); } } };
      d.onsubmit = null;
      d.querySelector('form').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); erledigt = true; d.onclose = null; d.close(); fertig(f); };
      d.onclose = () => { d.onclose = null; if (!erledigt) { erledigt = true; fertig(null); } };
      if (!d.open) d.showModal();
      const i = d.querySelector('input'); if (i) setTimeout(() => i.focus(), 50);
    });
  }

  /* ---------- Einladung annehmen ---------- */
  async function einladungPruefen() {
    if (!online() || demo()) return;
    let code = ''; try { code = localStorage.getItem('ordasio.haushalt') || ''; } catch {}
    let erledigt = []; try { erledigt = JSON.parse(localStorage.getItem('ordasio.haushalt.erledigt') || '[]'); } catch {}
    if (!code) { try { const s = (await sb().auth.getSession()).data.session; code = (s && s.user && s.user.user_metadata && s.user.user_metadata.haushalt) || ''; } catch {} }
    if (!code || erledigt.includes(code)) return;
    const fertig = () => { try { localStorage.removeItem('ordasio.haushalt'); localStorage.setItem('ordasio.haushalt.erledigt', JSON.stringify([...erledigt, code].slice(-10))); } catch {} };
    let a = null; try { a = await rpc('haushalt_einladung_ansehen', { p_code: code }); } catch { return; }
    if (!a || !a.gueltig) { fertig(); return; }
    if (hh()) {
      if (mitglieder().some((m) => m.user_id === ich()) && hh().name === a.haushalt) { fertig(); return; }
      fertig(); toast('Sie sind schon in einem Haushalt. Um einer anderen Einladung zu folgen, treten Sie zuerst aus.'); return;
    }
    const f = await formular('Einladung in den Haushalt', `<p style="margin-top:0"><b>${esc(a.von)}</b> lädt Sie in «${esc(a.haushalt)}» ein.</p>
      <ul class="hh-punkte"><li>Sie sehen gemeinsam die Post im Briefkasten und wer welche Rechnung bezahlt hat.</li><li>Das Home-Büro ist für Sie gratis, solange Sie im Haushalt sind.</li><li>Ihre eigenen Konten, Ihr Budget und Ihre Ordner bleiben privat.</li></ul>
      <input type="hidden" name="ok" value="1">`, 'Beitreten');
    if (!f) { fertig(); return; }
    try { info = await rpc('haushalt_beitreten', { p_code: code }); fertig(); geladen = false; await laden(true); toast('Willkommen im Haushalt'); if (H.setzeAnsicht) H.setzeAnsicht('briefkasten'); }
    catch (e) { toast(fehlerText(e)); }
  }

  /* ---------- Bedienung ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-hh-erstellen]')) erstellen();
    else if (t.closest('[data-hh-einladen]')) einladen();
    else if (t.closest('[data-hh-post]')) postErfassen();
    else if (t.closest('[data-hh-rg-teilen]')) rechnungWaehlen();
    else if (t.closest('[data-hh-neu-laden]')) { geladen = false; neuZeichnen(); }
    else if (t.closest('[data-hh-eintrag]')) oeffnen(t.closest('[data-hh-eintrag]').dataset.hhEintrag);
    else if (t.closest('[data-hh-filter]')) { filter = t.closest('[data-hh-filter]').dataset.hhFilter; neuZeichnen(); }
    else if (t.closest('[data-hh-austreten]')) austreten(t.closest('[data-hh-austreten]').dataset.hhAustreten);
    else if (t.closest('[data-hh-link]')) { const b = t.closest('[data-hh-link]'); linkZeigen(b.dataset.hhLink, b.dataset.name || ''); }
    else if (t.closest('[data-hh-zurueck]')) { rpc('haushalt_einladung_weg', { p_code: t.closest('[data-hh-zurueck]').dataset.hhZurueck }).then(() => laden()).then(() => toast('Einladung zurückgezogen')).catch((x) => toast(fehlerText(x))); }
    else if (t.closest('[data-hh-umbenennen]')) formular('Haushalt umbenennen', `<label>Name<input name="name" maxlength="60" value="${esc(hh() ? hh().name : '')}" required></label>`, 'Speichern')
      .then((f) => f && rpc('haushalt_umbenennen', { p_name: f.get('name') || '' }).then(() => laden())).catch((x) => toast(fehlerText(x)));
    else if (t.closest('[data-hh-teilen-r]')) {
      const id = t.closest('[data-hh-teilen-r]').dataset.hhTeilenR; const r = ((H.daten && H.daten.rechnungen) || []).find((x) => x.id === id); if (!r) return;
      const b = t.closest('[data-hh-teilen-r]'); b.disabled = true; b.textContent = 'Wird geteilt …';
      rechnungTeilen(r).then((x) => { if (x) { b.textContent = 'Geteilt'; toast('Im Haushalt geteilt'); neuZeichnen(); } else { b.disabled = false; b.textContent = 'Im Haushalt teilen'; } });
    }
  });
  // Neu laden, wenn die App wieder in den Vordergrund kommt, und regelmässig im Briefkasten
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && geladen) laden(true); });
  setInterval(() => { if (document.visibilityState === 'visible' && geladen && ['briefkasten', 'haushalt'].includes(aktuelleAnsicht())) laden(true); }, 60e3);

  let gestartet = false;
  async function los() {
    if (gestartet || !online() || demo()) return; gestartet = true;
    await laden(true);
    einladungPruefen();
  }
  document.addEventListener('ordasio-lizenz', () => setTimeout(los, 50));
  if (window.NASUVIA_LIZENZ) setTimeout(los, 50);

  const SYMBOL_HAUS = '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><rect x="9" y="13" width="6" height="7" rx="1"/></svg>';
  const SYMBOL_KAMERA = '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  const st = document.createElement('style');
  st.textContent = `
    .hh-einstieg{max-width:640px}.hh-symbol svg,.hh-foto svg{width:38px;height:38px;stroke:var(--blau,#0B3B2E);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .hh-punkte{margin:8px 0 14px;padding-left:20px;display:grid;gap:6px;color:var(--text,#3F5A4F);font-size:14.5px}
    .hh-zeile b{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.hh-neu b{color:var(--tinte,#0A1F17)}
    .hh-punkt{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--elektrik,#0E7A55);margin-right:4px;flex:none}
    .hh-foto{display:grid!important;place-items:center;gap:4px;text-align:center;border:1.5px dashed var(--linie,#E1E9E5);border-radius:14px;padding:18px 12px;cursor:pointer;background:var(--flaeche,#F3F8F5);color:var(--tinte,#0A1F17)}
    .hh-foto small{color:var(--leise,#7C8499);font-weight:400}.hh-foto img{max-width:100%;max-height:200px;border-radius:10px;display:block}.hh-pdf{font-weight:600}
    .hh-status{margin:6px 0 10px}
    .hh-bild img{max-width:100%;max-height:300px;border-radius:12px;display:block;margin:0 0 10px}.hh-bild:empty{display:none}
    .hh-tun{background:var(--flaeche,#F3F8F5);border-radius:12px;padding:10px 12px;margin:0 0 10px}
    .hh-fakten{display:grid;gap:2px;margin:0 0 12px}.hh-zeile-k{display:grid;grid-template-columns:80px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--linie,#E1E9E5)}
    .hh-zeile-k span{color:var(--leise,#7C8499);font-size:13px}.hh-zeile-k b{overflow-wrap:anywhere;font-weight:600}
    .hh-notizen{margin-top:6px}.hh-notiz{background:var(--flaeche,#F3F8F5);border-radius:10px;padding:8px 10px;margin:6px 0;overflow-wrap:anywhere}.hh-notiz small{display:block;color:var(--leise,#7C8499);font-size:12px}
    .hh-notiz-neu{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:8px}.hh-notiz-neu input{min-width:0}
    .hh-teilen{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.hh-teilen a.btn{text-decoration:none;display:inline-flex;align-items:center}`;
  document.head.appendChild(st);

  H.ansichten = Object.assign(H.ansichten || {}, { briefkasten, haushalt: personen });
  H.haushaltNeuLaden = () => laden(true);
})();
