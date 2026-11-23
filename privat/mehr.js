// Home-Büro, Erweiterungen: Bargeld, fixe Zahlungen, Guthaben, Sparziele, Kalender, Ordner, Zuletzt gelöscht,
// Texterkennung für Fotos, Hilfe zum Kontoauszug. Wird vor dem Hauptskript geladen und greift über window.HomeBuero zu.
(() => {
  'use strict';
  const H = (window.HomeBuero = window.HomeBuero || {});
  const $ = (id) => document.getElementById(id);
  const D = () => H.daten;
  const plusTage = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const FARBEN = ['#0B3B2E', '#0E7A55', '#0E9F6E', '#F5B53D', '#E5484D', '#A855F7', '#14B8A6', '#F97316', '#64748B', '#EC4899'];

  // Kleines Formular-Fenster im Stil des Home-Büros
  function formular(titel, felder, beiOk, { loeschen, extra = '' } = {}) {
    const dlg = $('dlg');
    dlg.innerHTML = `<form class="dlg"><h3>${titel}</h3>${felder}${extra}
      <div class="fuss">${loeschen ? '<button type="button" class="btn rot" data-f-weg>Löschen</button>' : '<span></span>'}<span class="aktionen"><button type="button" class="btn" data-f-zu>Abbrechen</button><button class="btn haupt">Speichern</button></span></div></form>`;
    const f = dlg.querySelector('form');
    f.onclick = async (e) => { if (e.target.closest('[data-f-zu]')) dlg.close(); if (e.target.closest('[data-f-weg]') && (await loeschen()) !== false) { dlg.close(); H.zeichnen(); } };
    f.onsubmit = async (e) => { e.preventDefault(); if ((await beiOk(new FormData(f), f)) !== false) { dlg.close(); H.zeichnen(); } };
    dlg.showModal();
    return f;
  }
  const feld = (label, html) => `<label>${label}${html}</label>`;
  const zwei = (a, b) => `<div class="zwei">${a}${b}</div>`;
  const betragFeld = (name, wert, ph = '0.00') => `<input type="text" inputmode="decimal" name="${name}" value="${wert ? H.chf(wert).replace(/’/g, '') : ''}" placeholder="${ph}">`;
  const kopf = (titel, unter, knoepfe = '') => `<div class="kopf"><div><h1>${titel}</h1><p class="unter">${unter}</p></div><div class="aktionen">${knoepfe}</div></div>`;

  /* ---------- Bargeld ---------- */
  function bargeldStand() {
    const d = D(), abgehoben = d.bewegungen.filter((b) => b.kategorie === 'bargeld' && b.betragRappen < 0).reduce((s, b) => s - b.betragRappen, 0);
    const manuell = d.bargeld.reduce((s, x) => s + (x.art === 'ausgabe' ? -x.betragRappen : x.betragRappen), 0);
    const ausgegeben = d.bargeld.filter((x) => x.art === 'ausgabe').reduce((s, x) => s + x.betragRappen, 0);
    return { abgehoben, ausgegeben, bestand: abgehoben + manuell };
  }
  function bargeld() {
    const d = D(), s = bargeldStand();
    const auto = d.bewegungen.filter((b) => b.kategorie === 'bargeld' && b.betragRappen < 0).map((b) => ({ datum: b.datum, text: 'Bancomat · ' + (b.partner || b.text || ''), betrag: -b.betragRappen, auto: true }));
    const alle = [...auto, ...d.bargeld.map((x) => ({ ...x, betrag: x.art === 'ausgabe' ? -x.betragRappen : x.betragRappen }))].sort((a, b) => (a.datum < b.datum ? 1 : -1));
    const katAus = {}; for (const x of d.bargeld.filter((y) => y.art === 'ausgabe')) katAus[x.kategorie || 'uebrig'] = (katAus[x.kategorie || 'uebrig'] || 0) + x.betragRappen;
    return kopf('Bargeld', 'Was Sie abgehoben haben, wofür Sie bar bezahlt haben und was noch im Portemonnaie ist.',
      '<button class="btn" data-hbm="bargeld:bezug">Abgehoben</button><button class="btn haupt" data-hbm="bargeld:ausgabe">+ Bar bezahlt</button>') +
      `<div class="raster r4"><div class="card zahl"><div class="l">Im Portemonnaie</div><div class="w ${s.bestand < 0 ? 'minus' : ''}">${H.chf(s.bestand)}</div><div class="k">laut Erfassung</div></div>
        <div class="card zahl"><div class="l">Abgehoben</div><div class="w">${H.chf(s.abgehoben + d.bargeld.filter((x) => x.art === 'bezug').reduce((a, x) => a + x.betragRappen, 0))}</div><div class="k">Bancomat und von Hand</div></div>
        <div class="card zahl"><div class="l">Bar ausgegeben</div><div class="w">${H.chf(s.ausgegeben)}</div><div class="k">${d.bargeld.filter((x) => x.art === 'ausgabe').length} Zahlungen</div></div>
        <div class="card zahl"><div class="l">Bar erhalten</div><div class="w plus">${H.chf(d.bargeld.filter((x) => x.art === 'einnahme').reduce((a, x) => a + x.betragRappen, 0))}</div><div class="k">z. B. Geschenk, Rückzahlung</div></div></div>
      <div class="raster r2 voll abstand"><div class="card"><h2>Alle Bargeld-Bewegungen</h2>${alle.length ? alle.map((x) => `<div class="zeile ${x.auto ? '' : 'klick'}" ${x.auto ? '' : `data-bar="${x.id}"`}><span style="min-width:0"><b>${H.esc(x.text || (x.art === 'bezug' ? 'Abgehoben' : x.art === 'einnahme' ? 'Bar erhalten' : 'Bar bezahlt'))}</b><small>${H.dk(x.datum)}${x.auto ? ' · aus dem Kontoauszug' : x.kategorie ? ' · ' + H.esc(H.katName(x.kategorie)) : ''}</small></span><span class="betrag ${x.betrag < 0 ? '' : 'plus'}">${x.betrag > 0 ? '+' : ''}${H.chf(x.betrag)}</span></div>`).join('')
        : '<p class="leer">Noch nichts erfasst. Bancomat-Bezüge aus dem Kontoauszug erscheinen hier automatisch.</p>'}
        <button class="btn klein abstand" data-hbm="bargeld:einnahme">+ Bar erhalten</button></div>
        <div class="card"><h2>Wofür bar bezahlt</h2>${Object.keys(katAus).length ? H.ring(Object.entries(katAus).sort((a, b) => b[1] - a[1]).map(([k, w]) => ({ n: H.katName(k), w, f: H.katFarbe(k) }))) : '<p class="leer">Noch keine Bar-Ausgaben.</p>'}</div></div>`;
  }
  function barDialog(art, x) {
    const neu = !x; x = x || { id: H.neueId(), art, datum: H.heute() };
    formular({ ausgabe: 'Bar bezahlt', bezug: 'Bargeld abgehoben', einnahme: 'Bargeld erhalten' }[x.art],
      zwei(feld('Betrag CHF', betragFeld('betrag', x.betragRappen)), feld('Datum', `<input type="date" name="datum" value="${x.datum}" required>`)) +
      feld(x.art === 'ausgabe' ? 'Wofür' : 'Notiz', `<input type="text" name="text" value="${H.esc(x.text || '')}" maxlength="120" placeholder="${x.art === 'ausgabe' ? 'z. B. Wochenmarkt' : ''}">`) +
      (x.art === 'ausgabe' ? feld('Kategorie', `<select name="kat">${H.KAT.map(([id, n]) => `<option value="${id}" ${id === (x.kategorie || 'lebensmittel') ? 'selected' : ''}>${H.esc(n)}</option>`).join('')}</select>`) : ''),
      (fd) => { const b = H.betragLesen(fd.get('betrag')); if (!(b > 0)) { H.toast('Bitte einen Betrag eingeben'); return false; }
        Object.assign(x, { betragRappen: b, datum: fd.get('datum'), text: String(fd.get('text') || '').trim(), kategorie: fd.get('kat') || '' });
        if (neu) D().bargeld.push(x); H.sichern(); H.toast('Gespeichert'); },
      { loeschen: neu ? null : () => H.wegwerfen('bargeld', x, x.text || 'Bargeld') });
  }

  /* ---------- Fixe Zahlungen: Miete am 25., Daueraufträge, Lastschriften ---------- */
  const ART_FIX = { dauerauftrag: 'Dauerauftrag', lsv: 'Lastschrift (LSV/Direct Debit)', ebill: 'eBill', karte: 'Kreditkarte', manuell: 'Selbst bezahlen' };
  const RHYTHMUS = { 1: 'monatlich', 3: 'vierteljährlich', 6: 'halbjährlich', 12: 'jährlich' };
  function naechstesDatum(f, ab = H.heute()) {
    const [j, m] = ab.split('-').map(Number);
    const start = f.start || ab.slice(0, 7);
    for (let i = 0; i < 400; i++) {
      const d = new Date(j, m - 1 + i, 1, 12), mo = d.getMonth() + 1, jahr = d.getFullYear();
      const ym = `${jahr}-${String(mo).padStart(2, '0')}`;
      const abstand = (jahr - Number(start.slice(0, 4))) * 12 + (mo - Number(start.slice(5, 7)));
      if (abstand < 0 || abstand % (Number(f.rhythmus) || 1)) continue;
      const tag = Math.min(Number(f.tag) || 1, new Date(jahr, mo, 0).getDate());
      const iso = `${ym}-${String(tag).padStart(2, '0')}`;
      if (iso >= ab) return iso;
    }
    return '';
  }
  function fix() {
    const l = D().fix.map((f) => ({ ...f, naechste: naechstesDatum(f) })).sort((a, b) => (a.naechste < b.naechste ? -1 : 1));
    const proMonat = l.reduce((s, f) => s + Math.round(f.betragRappen / (Number(f.rhythmus) || 1)), 0);
    return kopf('Fixe Zahlungen', 'Miete, Krankenkasse, Leasing: was wann fällig ist und wie es bezahlt wird.', '<button class="btn" data-hbm="fixVorschlag">Aus Abos vorschlagen</button><button class="btn haupt" data-hbm="fix">+ Fixe Zahlung</button>') +
      `<div class="raster r4"><div class="card zahl"><div class="l">Pro Monat</div><div class="w">${H.chf(proMonat)}</div><div class="k">umgerechnet</div></div>
        <div class="card zahl"><div class="l">Pro Jahr</div><div class="w">${H.chf(proMonat * 12)}</div><div class="k">${l.length} Zahlungen</div></div>
        <div class="card zahl"><div class="l">Nächste 14 Tage</div><div class="w">${H.chf(l.filter((f) => f.naechste && f.naechste <= plusTage(H.heute(), 14)).reduce((s, f) => s + f.betragRappen, 0))}</div><div class="k">fällig</div></div>
        <div class="card zahl"><div class="l">Selbst bezahlen</div><div class="w">${l.filter((f) => f.art === 'manuell' || f.art === 'ebill').length}</div><div class="k">nicht automatisch</div></div></div>
      <div class="card abstand">${l.length ? l.map((f) => { const t = H.tageBis(f.naechste); return `<div class="zeile klick" data-fix="${f.id}"><span style="min-width:0"><b>${H.esc(f.name)}</b><small>Am ${f.tag}. · ${RHYTHMUS[f.rhythmus] || 'monatlich'} · ${ART_FIX[f.art] || ''} · nächste ${H.dk(f.naechste)}${t <= 3 ? ` <span class="minus">(${t === 0 ? 'heute' : 'in ' + t + ' Tagen'})</span>` : ''}</small></span><span class="betrag">${H.chf(f.betragRappen)}</span></div>`; }).join('')
        : '<p class="leer">Noch keine fixen Zahlungen. Tipp: „Aus Abos vorschlagen“ übernimmt erkannte Zahlungen aus dem Kontoauszug.</p>'}</div>
      <div class="info-box">Selbst zu bezahlende Rechnungen und eBills erscheinen 3 Tage vorher unter „Jetzt wichtig“ auf der Übersicht und im Kalender.</div>`;
  }
  function fixDialog(f) {
    const neu = !f; f = f || { id: H.neueId(), tag: 25, rhythmus: 1, art: 'dauerauftrag', start: H.heute().slice(0, 7) };
    formular(neu ? 'Fixe Zahlung' : H.esc(f.name),
      zwei(feld('Wofür', `<input type="text" name="name" value="${H.esc(f.name || '')}" required maxlength="80" placeholder="z. B. Miete">`), feld('Betrag CHF', betragFeld('betrag', f.betragRappen))) +
      zwei(feld('Fällig am (Tag im Monat)', `<input type="number" name="tag" min="1" max="31" value="${f.tag}" required>`), feld('Wie oft', `<select name="rhythmus">${Object.entries(RHYTHMUS).map(([k, n]) => `<option value="${k}" ${Number(f.rhythmus) === Number(k) ? 'selected' : ''}>${n}</option>`).join('')}</select>`)) +
      zwei(feld('Wie bezahlt', `<select name="art">${Object.entries(ART_FIX).map(([k, n]) => `<option value="${k}" ${f.art === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`), feld('Ab Monat', `<input type="month" name="start" value="${f.start}">`)),
      (fd) => { const b = H.betragLesen(fd.get('betrag')); if (!(b > 0)) { H.toast('Bitte einen Betrag eingeben'); return false; }
        Object.assign(f, { name: String(fd.get('name')).trim(), betragRappen: b, tag: Math.min(31, Math.max(1, Number(fd.get('tag')) || 1)), rhythmus: Number(fd.get('rhythmus')) || 1, art: fd.get('art'), start: fd.get('start') || H.heute().slice(0, 7) });
        if (neu) D().fix.push(f); H.sichern(); H.toast('Gespeichert'); },
      { loeschen: neu ? null : () => H.wegwerfen('fix', f, f.name) });
  }

  /* ---------- Mir geschuldet: Geld, das andere mir zurückzahlen müssen ---------- */
  const offenG = (g) => Math.max(0, g.betragRappen - (g.zahlungen || []).reduce((s, z) => s + z.betragRappen, 0));
  function guthaben() {
    const l = [...D().guthaben].sort((a, b) => (offenG(b) > 0) - (offenG(a) > 0) || (a.faellig || '9').localeCompare(b.faellig || '9'));
    const offen = l.filter((g) => offenG(g) > 0);
    const proPerson = {}; for (const g of offen) proPerson[g.person] = (proPerson[g.person] || 0) + offenG(g);
    return kopf('Mir geschuldet', 'Wer Ihnen noch Geld zurückzahlen muss, wie viel und seit wann.', '<button class="btn haupt" data-hbm="guthaben">+ Guthaben erfassen</button>') +
      `<div class="raster r4"><div class="card zahl"><div class="l">Noch offen</div><div class="w plus">${H.chf(offen.reduce((s, g) => s + offenG(g), 0))}</div><div class="k">${offen.length} Posten</div></div>
        <div class="card zahl"><div class="l">Personen</div><div class="w">${Object.keys(proPerson).length}</div><div class="k">schulden Ihnen etwas</div></div>
        <div class="card zahl"><div class="l">Überfällig</div><div class="w ${offen.some((g) => g.faellig && g.faellig < H.heute()) ? 'minus' : ''}">${offen.filter((g) => g.faellig && g.faellig < H.heute()).length}</div><div class="k">versprochenes Datum vorbei</div></div>
        <div class="card zahl"><div class="l">Zurückerhalten</div><div class="w">${H.chf(l.reduce((s, g) => s + (g.zahlungen || []).reduce((x, z) => x + z.betragRappen, 0), 0))}</div><div class="k">bisher</div></div></div>
      ${Object.keys(proPerson).length ? `<div class="card abstand"><h2>Pro Person</h2>${Object.entries(proPerson).sort((a, b) => b[1] - a[1]).map(([p, w]) => `<div class="zeile"><span><b>${H.esc(p)}</b></span><span class="betrag plus">${H.chf(w)}</span></div>`).join('')}</div>` : ''}
      <div class="card abstand">${l.length ? l.map((g) => { const o = offenG(g); return `<div class="zeile klick" data-gut="${g.id}"><span style="min-width:0"><b>${H.esc(g.person)}${o === 0 ? '<span class="marke-s m-ok">zurückbezahlt</span>' : ''}</b><small>${H.esc(g.grund || '')}${g.datum ? ' · seit ' + H.dk(g.datum) : ''}${g.faellig && o ? ` · versprochen bis ${H.dk(g.faellig)}` : ''}</small>${g.betragRappen ? `<div class="spur"><i style="width:${Math.round((1 - o / g.betragRappen) * 100)}%;background:var(--gruen)"></i></div>` : ''}</span><span class="betrag">${H.chf(o)}<small>von ${H.chf(g.betragRappen)}</small></span></div>`; }).join('')
        : '<p class="leer">Niemand schuldet Ihnen etwas. Oder Sie haben es noch nicht erfasst.</p>'}</div>`;
  }
  function gutDialog(g) {
    const neu = !g; g = g || { id: H.neueId(), datum: H.heute(), zahlungen: [] }; H._g = g;
    const o = offenG(g);
    const text = `Hallo ${(g.person || '').split(' ')[0]}, kleine Erinnerung: Es sind noch CHF ${H.chf(o)} offen${g.grund ? ' (' + g.grund + ')' : ''}. Danke dir!`;
    const f = formular(neu ? 'Guthaben erfassen' : H.esc(g.person),
      zwei(feld('Wer schuldet Ihnen Geld?', `<input type="text" name="person" value="${H.esc(g.person || '')}" required maxlength="80">`), feld('Betrag CHF', betragFeld('betrag', g.betragRappen))) +
      feld('Wofür', `<input type="text" name="grund" value="${H.esc(g.grund || '')}" maxlength="120" placeholder="z. B. Konzertticket, Darlehen">`) +
      zwei(feld('Seit', `<input type="date" name="datum" value="${g.datum || ''}">`), feld('Versprochen bis', `<input type="date" name="faellig" value="${g.faellig || ''}">`)),
      (fd) => { const b = H.betragLesen(fd.get('betrag')); if (!(b > 0)) { H.toast('Bitte einen Betrag eingeben'); return false; }
        Object.assign(g, { person: String(fd.get('person')).trim(), betragRappen: b, grund: String(fd.get('grund') || '').trim(), datum: fd.get('datum'), faellig: fd.get('faellig') });
        const z = H.betragLesen(fd.get('zahlung')); if (z > 0) g.zahlungen.push({ datum: H.heute(), betragRappen: z });
        if (neu) D().guthaben.push(g); H.sichern(); H.toast('Gespeichert'); },
      { loeschen: neu ? null : () => H.wegwerfen('guthaben', g, g.person),
        extra: neu ? '' : `<div><b style="font-size:14px">Rückzahlungen</b>${(g.zahlungen || []).map((z, i) => `<div class="zeile"><span>${H.dk(z.datum)}</span><span class="betrag">${H.chf(z.betragRappen)} <button type="button" class="btn klein rot" data-gz="${i}" aria-label="Rückzahlung löschen">×</button></span></div>`).join('') || '<p class="leer">Noch keine.</p>'}
          ${feld('Neue Rückzahlung CHF', '<input type="text" inputmode="decimal" name="zahlung" placeholder="0.00">')}</div>
          ${o ? `<div class="aktionen"><a class="btn klein" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Freundlich erinnern (WhatsApp)</a><a class="btn klein" href="sms:?&body=${encodeURIComponent(text)}">Per SMS</a></div>` : ''}` });
    return f;
  }

  /* ---------- Sparziele und was Sie schon sparen ---------- */
  const gespart = (z) => (z.einzahlungen || []).reduce((s, e) => s + e.betragRappen, 0);
  function sparen() {
    const d = D(), l = d.sparziele;
    const gekuendigt = H.abosFinden().filter((a) => a.status === 'gekuendigt').reduce((s, a) => s + a.proJahr, 0);
    const total = l.reduce((s, z) => s + gespart(z), 0);
    return kopf('Sparziele', 'Für Ferien, Auto oder Notgroschen: Ziel setzen, einzahlen, Fortschritt sehen.', '<button class="btn haupt" data-hbm="sparziel">+ Sparziel</button>') +
      `<div class="raster r4"><div class="card zahl"><div class="l">Gespart</div><div class="w plus">${H.chf(total)}</div><div class="k">in allen Zielen</div></div>
        <div class="card zahl"><div class="l">Ziele</div><div class="w">${l.length}</div><div class="k">${l.filter((z) => gespart(z) >= z.ziel).length} erreicht 🎉</div></div>
        <div class="card zahl"><div class="l">Gekündigte Abos</div><div class="w plus">${H.chf(gekuendigt)}</div><div class="k">sparen Sie pro Jahr</div></div>
        <div class="card zahl"><div class="l">Diesen Monat</div><div class="w">${H.chf(l.reduce((s, z) => s + (z.einzahlungen || []).filter((e) => e.datum.slice(0, 7) === H.heute().slice(0, 7)).reduce((x, e) => x + e.betragRappen, 0), 0))}</div><div class="k">eingezahlt</div></div></div>
      <div class="raster r2 abstand">${l.length ? l.map((z) => { const g = gespart(z), p = z.ziel ? Math.min(100, Math.round(g / z.ziel * 100)) : 0, rest = Math.max(0, z.ziel - g);
        const monate = z.bis ? Math.max(1, Math.round((new Date(z.bis + 'T12:00') - new Date()) / (30.4 * 864e5))) : 0;
        return `<div class="card klick" data-spar="${z.id}"><div style="display:flex;gap:12px;align-items:center"><span style="font-size:34px">${z.emoji || '🎯'}</span><div style="flex:1;min-width:0"><b style="font-size:17px">${H.esc(z.name)}</b><div class="hinweis">${H.chf(g)} von ${H.chf(z.ziel)} · ${p} %</div></div>${p >= 100 ? '<span class="marke-s m-ok">erreicht</span>' : ''}</div>
          <div class="spur" style="height:12px;margin-top:12px"><i style="width:${p}%;background:${z.farbe || 'var(--gruen)'}"></i></div>
          <p class="hinweis abstand">${p >= 100 ? 'Geschafft! 🎉' : `Noch ${H.chf(rest)}${monate ? ` · ca. ${H.chf(Math.ceil(rest / monate))} pro Monat bis ${H.dk(z.bis)}` : ''}`}</p>
          <div class="aktionen"><button class="btn klein haupt" data-einzahlen="${z.id}">+ Einzahlen</button></div></div>`; }).join('')
        : '<div class="card start" style="grid-column:1/-1"><div style="font-size:46px">🏝️</div><h2>Worauf sparen Sie?</h2><p>Legen Sie ein Ziel fest, zum Beispiel Ferien oder ein Auto. Jede Einzahlung bringt Sie sichtbar näher.</p><button class="btn haupt" data-hbm="sparziel">Erstes Sparziel</button></div>'}</div>`;
  }
  function sparDialog(z) {
    const neu = !z; z = z || { id: H.neueId(), emoji: '🏝️', einzahlungen: [], farbe: FARBEN[2] }; H._z = z;
    formular(neu ? 'Neues Sparziel' : H.esc(z.name),
      zwei(feld('Wofür', `<input type="text" name="name" value="${H.esc(z.name || '')}" required maxlength="60" placeholder="z. B. Ferien Griechenland">`), feld('Symbol', `<select name="emoji">${['🏝️', '🚗', '🏠', '💍', '🎓', '🛡️', '📱', '🚲', '✈️', '🎁', '🎯'].map((e) => `<option ${e === z.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select>`)) +
      zwei(feld('Ziel CHF', betragFeld('ziel', z.ziel)), feld('Bis wann (freiwillig)', `<input type="date" name="bis" value="${z.bis || ''}">`)) +
      `<div><span class="hinweis">Farbe</span><div style="display:flex;gap:8px;margin-top:6px">${FARBEN.map((c) => `<label style="display:block"><input type="radio" name="farbe" value="${c}" ${c === z.farbe ? 'checked' : ''} style="display:none"><span style="display:block;width:26px;height:26px;border-radius:50%;background:${c};outline:${c === z.farbe ? '3px solid #0A1F17' : '0'};outline-offset:2px;cursor:pointer" onclick="this.parentElement.parentElement.querySelectorAll('span').forEach(s=>s.style.outline='0');this.style.outline='3px solid #0A1F17'"></span></label>`).join('')}</div></div>` +
      (neu ? '' : `<div><b style="font-size:14px">Einzahlungen</b>${(z.einzahlungen || []).map((e, i) => [e, i]).reverse().map(([e, i]) => `<div class="zeile"><span>${H.dk(e.datum)}</span><span class="betrag">${H.chf(e.betragRappen)} <button type="button" class="btn klein rot" data-ez="${i}" aria-label="Einzahlung löschen">×</button></span></div>`).join('') || '<p class="leer">Noch keine.</p>'}</div>`),
      (fd) => { const ziel = H.betragLesen(fd.get('ziel')); if (!(ziel > 0)) { H.toast('Bitte ein Ziel eingeben'); return false; }
        Object.assign(z, { name: String(fd.get('name')).trim(), emoji: fd.get('emoji'), ziel, bis: fd.get('bis'), farbe: fd.get('farbe') || z.farbe });
        if (neu) D().sparziele.push(z); H.sichern(); H.toast('Gespeichert'); },
      { loeschen: neu ? null : () => H.wegwerfen('sparziele', z, z.name) });
  }
  function einzahlen(z) {
    formular(`${z.emoji || ''} ${H.esc(z.name)}: einzahlen`, zwei(feld('Betrag CHF', betragFeld('betrag', 0)), feld('Datum', `<input type="date" name="datum" value="${H.heute()}">`)) + '<p class="hinweis">Mit einem Minus (z. B. −50) buchen Sie Geld wieder heraus.</p>',
      (fd) => { const b = H.betragLesen(fd.get('betrag')); if (!b) { H.toast('Bitte einen Betrag eingeben'); return false; }
        const vorher = gespart(z) >= z.ziel; z.einzahlungen.push({ datum: fd.get('datum') || H.heute(), betragRappen: b }); H.sichern();
        H.toast(!vorher && gespart(z) >= z.ziel ? '🎉 Ziel erreicht! Gratulation!' : `Super, noch ${H.chf(Math.max(0, z.ziel - gespart(z)))} bis zum Ziel`); });
  }

  /* ---------- Kalender: eigene Einträge plus Fristen aus allen Bereichen ---------- */
  let kalMonat = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  function kalenderEintraege(von, bis) {
    const d = D(), l = [];
    for (const k of d.kalender) if (k.datum >= von && k.datum <= bis) l.push({ datum: k.datum, zeit: k.zeit, titel: k.titel, art: 'eigen', id: k.id, notiz: k.notiz });
    for (const r of d.rechnungen) if (r.status === 'offen' && r.faellig >= von && r.faellig <= bis) l.push({ datum: r.faellig, titel: `Rechnung fällig: ${r.titel || r.glaeubiger} (${H.chf(r.betragRappen)})`, art: 'rechnung', tab: 'rechnungen' });
    for (const f of d.fix) { let x = naechstesDatum(f, von); let n = 0; while (x && x <= bis && n++ < 40) { l.push({ datum: x, titel: `${f.name} (${H.chf(f.betragRappen)})${f.art === 'manuell' || f.art === 'ebill' ? ' · selbst bezahlen' : ''}`, art: 'fix', tab: 'fix' }); x = naechstesDatum(f, plusTage(x, 1)); } }
    for (const g of d.guthaben) if (offenG(g) && g.faellig >= von && g.faellig <= bis) l.push({ datum: g.faellig, titel: `${g.person} wollte ${H.chf(offenG(g))} zurückzahlen`, art: 'guthaben', tab: 'guthaben' });
    for (const b of d.betreibungen) if (b.status === 'zahlungsbefehl' && b.zugestellt) { const f = plusTage(b.zugestellt, 10); if (f >= von && f <= bis) l.push({ datum: f, titel: `Letzter Tag Rechtsvorschlag: ${b.glaeubiger}`, art: 'betreibung', tab: 'betreibung' }); }
    for (const z of d.sparziele) if (z.bis >= von && z.bis <= bis) l.push({ datum: z.bis, titel: `Sparziel ${z.name}`, art: 'spar', tab: 'sparen' });
    return l.sort((a, b) => (a.datum + (a.zeit || '') < b.datum + (b.zeit || '') ? -1 : 1));
  }
  const FARBE_ART = { eigen: '#0E7A55', rechnung: '#E5484D', fix: '#F5B53D', guthaben: '#0E9F6E', betreibung: '#B4282D', spar: '#A855F7' };
  function kalender() {
    const [j, m] = kalMonat.split('-').map(Number);
    const erster = `${kalMonat}-01`, letzter = `${kalMonat}-${String(new Date(j, m, 0).getDate()).padStart(2, '0')}`;
    const l = kalenderEintraege(erster, letzter);
    const startWt = (new Date(j, m - 1, 1).getDay() + 6) % 7, tage = new Date(j, m, 0).getDate();
    const zellen = [...Array(startWt).fill(null), ...Array.from({ length: tage }, (_, i) => `${kalMonat}-${String(i + 1).padStart(2, '0')}`)];
    return kopf('Kalender', 'Eigene Termine plus alle Fristen: Rechnungen, fixe Zahlungen, Guthaben und Betreibungen.', '<button class="btn haupt" data-hbm="kalEintrag">+ Eintrag</button>') +
      `<div class="card"><div class="kopf" style="margin-bottom:10px"><h2 style="margin:0">${MON[m - 1]} ${j}</h2><div class="aktionen"><button class="btn klein" data-kal="-1" aria-label="Monat zurück">‹</button><button class="btn klein" data-kal="0">Heute</button><button class="btn klein" data-kal="1" aria-label="Monat vor">›</button></div></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => `<div style="text-align:center;color:var(--leise);font-family:var(--mono);font-size:10px;letter-spacing:.1em">${w}</div>`).join('')}
          ${zellen.map((d) => d ? `<button type="button" data-kaltag="${d}" style="border:1px solid var(--linie);background:${d === H.heute() ? 'rgba(14,122,85,.08)' : '#fff'};border-radius:10px;min-height:58px;padding:4px;text-align:left;cursor:pointer;color:var(--tinte)"><b style="font-size:13px">${Number(d.slice(8))}</b><div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">${l.filter((x) => x.datum === d).slice(0, 4).map((x) => `<i style="width:7px;height:7px;border-radius:50%;background:${FARBE_ART[x.art]}"></i>`).join('')}</div></button>` : '<span></span>').join('')}</div></div>
      <div class="card abstand"><h2>Diesen Monat</h2>${l.length ? l.map((x) => `<div class="zeile klick" ${x.art === 'eigen' ? `data-kal-eintrag="${x.id}"` : `data-tab="${x.tab}"`}><span style="min-width:0"><b><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${FARBE_ART[x.art]};margin-right:6px"></i>${H.esc(x.titel)}</b><small>${WT[new Date(x.datum + 'T12:00').getDay()]} ${H.dk(x.datum)}${x.zeit ? ' · ' + x.zeit + ' Uhr' : ''}${x.notiz ? ' · ' + H.esc(x.notiz) : ''}</small></span></div>`).join('') : '<p class="leer">Nichts in diesem Monat.</p>'}</div>`;
  }
  function kalDialog(k, datum) {
    const neu = !k; k = k || { id: H.neueId(), datum: datum || H.heute() };
    formular(neu ? 'Neuer Eintrag' : H.esc(k.titel),
      feld('Was', `<input type="text" name="titel" value="${H.esc(k.titel || '')}" required maxlength="120" placeholder="z. B. Zahnarzt, Steuererklärung abgeben">`) +
      zwei(feld('Datum', `<input type="date" name="datum" value="${k.datum}" required>`), feld('Zeit (freiwillig)', `<input type="time" name="zeit" value="${k.zeit || ''}">`)) +
      feld('Notiz', `<input type="text" name="notiz" value="${H.esc(k.notiz || '')}" maxlength="300">`),
      (fd) => { Object.assign(k, { titel: String(fd.get('titel')).trim(), datum: fd.get('datum'), zeit: fd.get('zeit'), notiz: String(fd.get('notiz') || '').trim() });
        if (neu) D().kalender.push(k); kalMonat = k.datum.slice(0, 7); H.sichern(); H.toast('Gespeichert'); },
      { loeschen: neu ? null : () => H.wegwerfen('kalender', k, k.titel),
        extra: neu ? '' : `<button type="button" class="btn klein" data-ics="${k.id}">In den Handy-Kalender</button>` });
  }
  function ics(k) {
    const z = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
    const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ordasio//Home-Buero//DE', 'BEGIN:VEVENT', `UID:${k.id}@homebuero`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      k.zeit ? `DTSTART:${z(k.datum, k.zeit)}` : `DTSTART;VALUE=DATE:${z(k.datum)}`, `SUMMARY:${String(k.titel).replace(/[,;]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' })); a.download = 'Termin.ics'; a.click();
  }

  /* ---------- Ordner und Dokumente (auf diesem Gerät, in IndexedDB) ---------- */
  let ordnerJetzt = '';
  let dbOffen;
  const idb = () => dbOffen || (dbOffen = new Promise((ok, f) => { const r = indexedDB.open('homebuero-dateien', 1); r.onupgradeneeded = () => r.result.createObjectStore('dateien'); r.onsuccess = () => ok(r.result); r.onerror = () => f(r.error); }));
  const dateiSpeichern = async (id, blob) => { const db = await idb(); return new Promise((ok, f) => { const t = db.transaction('dateien', 'readwrite'); t.objectStore('dateien').put(blob, id); t.oncomplete = ok; t.onerror = () => f(t.error); }); };
  const dateiHolen = async (id) => { const db = await idb(); return new Promise((ok, f) => { const r = db.transaction('dateien').objectStore('dateien').get(id); r.onsuccess = () => ok(r.result); r.onerror = () => f(r.error); }); };
  const dateiLoeschen = async (id) => { const db = await idb(); return new Promise((ok) => { const t = db.transaction('dateien', 'readwrite'); t.objectStore('dateien').delete(id); t.oncomplete = ok; t.onerror = ok; }); };
  const groesse = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');
  const pfadVon = (id) => { const p = []; let o = D().ordner.find((x) => x.id === id); let n = 0; while (o && n++ < 30) { p.unshift(o); o = D().ordner.find((x) => x.id === o.parent); } return p; };
  const symbolDatei = (typ) => (typ.startsWith('image/') ? '🖼️' : typ === 'application/pdf' ? '📄' : /sheet|excel|csv/.test(typ) ? '📊' : /word|text/.test(typ) ? '📝' : '📎');
  function dokumente() {
    const d = D();
    if (ordnerJetzt && !d.ordner.some((o) => o.id === ordnerJetzt)) ordnerJetzt = '';
    const unter = d.ordner.filter((o) => (o.parent || '') === ordnerJetzt).sort((a, b) => a.name.localeCompare(b.name));
    const dateien = d.dokumente.filter((x) => (x.ordner || '') === ordnerJetzt).sort((a, b) => a.name.localeCompare(b.name));
    const pfad = pfadVon(ordnerJetzt);
    const zaehlen = (id) => d.dokumente.filter((x) => x.ordner === id).length + d.ordner.filter((o) => o.parent === id).length;
    return kopf('Ordner', 'Rechnungen, Verträge, Lohnausweise: ordentlich abgelegt, wie auf dem Computer.',
      `<button class="btn" data-hbm="ordnerNeu">+ Ordner</button><button class="btn" data-hbm="ordnerHoch">Ordner vom Computer</button><button class="btn haupt" data-hbm="dateiHoch">+ Dateien</button>`) +
      `<div class="card" id="ablage" style="min-height:220px">
        <div class="aktionen" style="margin-bottom:10px;font-size:14px"><button class="btn klein" data-ordner-gehe="">🏠 Alle Ordner</button>${pfad.map((o) => `<span>›</span><button class="btn klein" data-ordner-gehe="${o.id}">${H.esc(o.name)}</button>`).join('')}${ordnerJetzt ? `<span style="flex:1"></span><button class="btn klein" data-ordner-bearb="${ordnerJetzt}">Ordner bearbeiten</button>` : ''}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">
          ${unter.map((o) => `<button type="button" data-ordner-gehe="${o.id}" style="border:0;background:none;cursor:pointer;text-align:center;padding:10px 4px;border-radius:14px;color:var(--tinte)" onmouseover="this.style.background='var(--flaeche)'" onmouseout="this.style.background='none'">
            <svg viewBox="0 0 24 24" style="width:58px;height:58px"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="${o.farbe || '#0E7A55'}"/><path d="M2 9h20" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/></svg>
            <b style="display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H.esc(o.name)}</b><small style="color:var(--leise)">${zaehlen(o.id)} Einträge</small></button>`).join('')}
          ${dateien.map((x) => `<button type="button" data-datei="${x.id}" style="border:0;background:none;cursor:pointer;text-align:center;padding:10px 4px;border-radius:14px;color:var(--tinte)" onmouseover="this.style.background='var(--flaeche)'" onmouseout="this.style.background='none'">
            <div style="font-size:44px;line-height:58px">${symbolDatei(x.typ || '')}</div><b style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H.esc(x.name)}</b><small style="color:var(--leise)">${groesse(x.groesse || 0)}</small></button>`).join('')}
        </div>
        ${!unter.length && !dateien.length ? `<div class="start" style="padding:24px"><div style="font-size:44px">🗂️</div><h2>${ordnerJetzt ? 'Dieser Ordner ist leer' : 'Noch keine Ordner'}</h2><p>Dateien hierher ziehen, „+ Dateien“ tippen oder mit „Ordner vom Computer“ einen ganzen Ordner samt Unterordnern übernehmen.</p></div>` : ''}
        <p class="hinweis abstand" style="text-align:center">Dateien oder Ordner einfach in dieses Feld ziehen.</p></div>
      <div class="info-box abstand">Die Dateien bleiben auf diesem Gerät. Speichern Sie ab und zu eine Sicherung (unter Konto → Sicherung). ${navigator.storage && navigator.storage.estimate ? '<span id="platz"></span>' : ''}</div>`;
  }
  async function dateienAufnehmen(liste, ordnerId) {
    // liste: [{ datei: File, pfad: ['Ordner', 'Unterordner'] }]
    const d = D(); let n = 0;
    const ordnerFuer = (pfad) => { let parent = ordnerId || ''; for (const name of pfad) { let o = d.ordner.find((x) => (x.parent || '') === parent && x.name === name); if (!o) { o = { id: H.neueId(), name, parent, farbe: FARBEN[d.ordner.length % FARBEN.length] }; d.ordner.push(o); } parent = o.id; } return parent; };
    for (const { datei, pfad } of liste) {
      if (datei.size > 25e6) { H.toast(`${datei.name} ist grösser als 25 MB`); continue; }
      const id = H.neueId();
      try { await dateiSpeichern(id, datei); } catch { H.toast('Kein Platz mehr auf diesem Gerät'); break; }
      d.dokumente.push({ id, name: datei.name, typ: datei.type || '', groesse: datei.size, ordner: ordnerFuer(pfad || []), datum: H.heute() }); n++;
    }
    H.sichern(); H.zeichnen(); if (n) H.toast(`${n} ${n === 1 ? 'Datei' : 'Dateien'} abgelegt`);
  }
  // Ordner per Ziehen: Unterordner rekursiv lesen
  async function eintraegeLesen(eintrag, pfad, aus) {
    if (eintrag.isFile) { const datei = await new Promise((ok, f) => eintrag.file(ok, f)); aus.push({ datei, pfad }); return; }
    if (eintrag.isDirectory) {
      const leser = eintrag.createReader(); let teil;
      do { teil = await new Promise((ok) => leser.readEntries(ok, () => ok([]))); for (const e of teil) await eintraegeLesen(e, [...pfad, eintrag.name], aus); } while (teil.length);
    }
  }
  document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('#ablage')) { e.preventDefault(); e.target.closest('#ablage').style.outline = '3px dashed var(--elektrik)'; } });
  document.addEventListener('dragleave', (e) => { const a = e.target.closest && e.target.closest('#ablage'); if (a) a.style.outline = ''; });
  document.addEventListener('drop', async (e) => {
    const a = e.target.closest && e.target.closest('#ablage'); if (!a) return;
    e.preventDefault(); a.style.outline = '';
    const items = [...(e.dataTransfer.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean), aus = [];
    if (items.length) for (const it of items) await eintraegeLesen(it, [], aus); else for (const f of e.dataTransfer.files) aus.push({ datei: f, pfad: [] });
    dateienAufnehmen(aus, ordnerJetzt);
  });
  function ordnerDialog(o) {
    const neu = !o; o = o || { id: H.neueId(), parent: ordnerJetzt, farbe: FARBEN[D().ordner.length % FARBEN.length] };
    formular(neu ? 'Neuer Ordner' : 'Ordner bearbeiten', feld('Name', `<input type="text" name="name" value="${H.esc(o.name || '')}" required maxlength="60" placeholder="z. B. Versicherungen">`) +
      `<div><span class="hinweis">Farbe</span><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">${FARBEN.map((c) => `<label><input type="radio" name="farbe" value="${c}" ${c === o.farbe ? 'checked' : ''} style="accent-color:${c}"><span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${c};vertical-align:middle"></span></label>`).join('')}</div></div>`,
      (fd) => { o.name = String(fd.get('name')).trim(); o.farbe = fd.get('farbe') || o.farbe; if (neu) D().ordner.push(o); H.sichern(); },
      { loeschen: neu ? null : async () => {
        const d = D(), ids = new Set([o.id]); let w = true; while (w) { w = false; for (const x of d.ordner) if (ids.has(x.parent) && !ids.has(x.id)) { ids.add(x.id); w = true; } }
        if (!await UI.frage(`Ordner „${o.name}“ mit ${d.dokumente.filter((x) => ids.has(x.ordner)).length} Dateien löschen?\n\nAlles kommt 30 Tage in „Zuletzt gelöscht“.`)) return false;
        const weg = { ordner: d.ordner.filter((x) => ids.has(x.id)), dokumente: d.dokumente.filter((x) => ids.has(x.ordner)) };
        d.ordner = d.ordner.filter((x) => !ids.has(x.id)); d.dokumente = d.dokumente.filter((x) => !ids.has(x.ordner));
        d.papierkorb.unshift({ pid: H.neueId(), pfad: 'ordnerbaum', eintrag: weg, titel: 'Ordner ' + o.name, am: new Date().toISOString() });
        ordnerJetzt = o.parent || ''; H.sichern(); H.toast('In „Zuletzt gelöscht“ verschoben');
      } });
  }
  async function dateiOeffnen(x) {
    const blob = await dateiHolen(x.id); if (!blob) { H.toast('Datei nicht gefunden'); return; }
    const url = URL.createObjectURL(blob);
    const dlg = $('dlg');
    dlg.innerHTML = `<div class="dlg"><h3 style="word-break:break-all">${H.esc(x.name)}</h3><p class="hinweis">${groesse(x.groesse || 0)} · abgelegt am ${H.dk(x.datum)}</p>
      ${(x.typ || '').startsWith('image/') ? `<img src="${url}" style="max-width:100%;border-radius:12px">` : x.typ === 'application/pdf' ? `<iframe src="${url}" style="width:100%;height:60vh;border:0;border-radius:12px"></iframe>` : ''}
      <label>In Ordner verschieben<select data-verschieben><option value="">Alle Ordner (oberste Ebene)</option>${D().ordner.map((o) => `<option value="${o.id}" ${o.id === x.ordner ? 'selected' : ''}>${pfadVon(o.id).map((p) => H.esc(p.name)).join(' › ')}</option>`).join('')}</select></label>
      <label>Name<input type="text" data-umbenennen value="${H.esc(x.name)}"></label>
      <div class="fuss"><button type="button" class="btn rot" data-datei-weg>Löschen</button><span class="aktionen"><a class="btn" href="${url}" download="${H.esc(x.name)}">Herunterladen</a><a class="btn" href="${url}" target="_blank" rel="noopener">Öffnen</a><button type="button" class="btn haupt" data-datei-ok>Fertig</button></span></div></div>`;
    dlg.onclick = async (e) => {
      if (e.target.closest('[data-datei-ok]')) { const n = dlg.querySelector('[data-umbenennen]').value.trim(); if (n) x.name = n; x.ordner = dlg.querySelector('[data-verschieben]').value; H.sichern(); dlg.close(); H.zeichnen(); }
      if (e.target.closest('[data-datei-weg]') && await H.wegwerfen('dokumente', x, x.name)) { dlg.close(); H.zeichnen(); }
    };
    dlg.showModal();
  }
  function dateiWaehlen(ordner) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
    if (ordner) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
    inp.onchange = () => dateienAufnehmen([...inp.files].map((f) => ({ datei: f, pfad: (f.webkitRelativePath || '').split('/').slice(0, -1) })), ordnerJetzt);
    inp.click();
  }

  /* ---------- Zuletzt gelöscht ---------- */
  function papierkorb() {
    const l = D().papierkorb;
    return kopf('Zuletzt gelöscht', 'Gelöschtes bleibt 30 Tage hier. Danach wird es automatisch endgültig entfernt.', l.length ? '<button class="btn rot" data-hbm="korbLeeren">Alles endgültig löschen</button>' : '') +
      `<div class="card">${l.length ? l.map((p) => { const tage = 30 - Math.floor((Date.now() - Date.parse(p.am)) / 864e5); return `<div class="zeile"><span style="min-width:0"><b>${H.esc(p.titel || 'Eintrag')}</b><small>${H.esc(p.pfad === 'ordnerbaum' ? 'Ordner mit Inhalt' : H.ORT[p.pfad] || '')} · gelöscht am ${H.dk(p.am.slice(0, 10))} · noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'}</small></span>
        <span class="aktionen"><button class="btn klein" data-zurueck="${p.pid}">Wiederherstellen</button><button class="btn klein rot" data-endgueltig="${p.pid}">Endgültig</button></span></div>`; }).join('') : '<p class="leer">Nichts gelöscht.</p>'}</div>`;
  }
  async function endgueltig(p) {
    if (p.pfad === 'dokumente') await dateiLoeschen(p.eintrag.id);
    if (p.pfad === 'ordnerbaum') for (const x of p.eintrag.dokumente) await dateiLoeschen(x.id);
  }

  /* ---------- Texterkennung für Fotos (Tesseract, wird erst bei Bedarf geladen) ---------- */
  let tesseract;
  H.textLesen = async (bild) => {
    if (!tesseract) tesseract = new Promise((ok, f) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = () => ok(window.Tesseract); s.onerror = f; document.head.appendChild(s); });
    const T = await tesseract;
    const { data } = await T.recognize(bild, 'deu');
    return data.text || '';
  };
  H.betreibungAusText = (text) => {
    const t = text.replace(/\r/g, '');
    const betraege = [...t.matchAll(/(?:CHF|Fr\.?)\s*([0-9’'.\s]{1,10}[.,]\d{2})|([0-9’']{1,3}(?:[’'][0-9]{3})*[.,]\d{2})\s*(?:CHF|Fr)/gi)].map((m) => Math.round(Number((m[1] || m[2]).replace(/[’'\s]/g, '').replace(',', '.')) * 100)).filter((n) => n > 0 && n < 1e9);
    const total = (t.match(/(?:Total|Forderung|Betrag)[^\n]{0,40}?([0-9’']{1,3}(?:[’'][0-9]{3})*[.,]\d{2})/i) || [])[1];
    const nummer = (t.match(/Betreibung(?:s)?[- ]?(?:Nr\.?|Nummer)\s*[:.]?\s*([0-9][0-9\s./-]{3,})/i) || [])[1];
    const glaeubiger = (t.match(/Gläubiger(?:in)?\s*[:.]?\s*\n?\s*([^\n]{3,60})/i) || [])[1];
    const amt = (t.match(/(Betreibungsamt[^\n]{0,50})/i) || [])[1];
    return { betrag: total ? Math.round(Number(total.replace(/[’'\s]/g, '').replace(',', '.')) * 100) : (betraege.length ? Math.max(...betraege) : 0),
      nummer: nummer ? nummer.trim().replace(/\s+/g, ' ') : '', glaeubiger: glaeubiger ? glaeubiger.trim() : '', amt: amt ? amt.trim() : '', verlustschein: /Verlustschein/i.test(t) };
  };

  /* ---------- Hilfe: Kontoauszug bei der Bank holen ---------- */
  const BANKEN = [
    ['UBS', 'E-Banking oder App: Konto antippen, oben rechts „Export“ bzw. „Transaktionen exportieren“, Zeitraum wählen, Format CSV oder camt.053.'],
    ['PostFinance', 'E-Finance: „Konten und Karten“ → Konto → „Bewegungen“, dann „Export“ und CSV oder camt.053 wählen.'],
    ['Raiffeisen', 'E-Banking: „Konten“ → Konto wählen → „Kontoauszug/Bewegungen“ → „Exportieren“ (CSV) oder camt.053 unter „Dokumente“.'],
    ['Zürcher Kantonalbank (ZKB)', 'eBanking: Konto → „Buchungen“ → Symbol „Exportieren“ → CSV. Andere Kantonalbanken sind ähnlich aufgebaut.'],
    ['Migros Bank', 'E-Banking: „Konten“ → Konto → „Kontobewegungen“ → „Export“ als CSV.'],
    ['Neon, Yuh, Revolut', 'In der App: Konto → „Kontoauszug“ oder „Statements“, Zeitraum wählen, Format CSV (wenn angeboten) oder PDF.'],
    ['Andere Bank', 'Im E-Banking nach „Export“, „Bewegungen herunterladen“ oder „camt.053“ suchen. CSV oder camt.053 funktioniert, PDF nicht.'],
  ];
  function bankHilfe() {
    const dlg = $('dlg');
    dlg.innerHTML = `<div class="dlg"><h3>So holen Sie den Kontoauszug</h3><p class="hinweis">Am besten als CSV- oder camt.053-Datei, für die letzten 3 bis 12 Monate. Die Bezeichnungen können je nach Bank leicht abweichen.</p>
      ${BANKEN.map(([b, s]) => `<details style="border-top:1px solid var(--linie);padding:10px 0"><summary style="cursor:pointer;font-weight:600">${b}</summary><p class="hinweis" style="margin-top:6px">${s}</p></details>`).join('')}
      <p class="hinweis abstand"><b>Betreibungsregisterauszug</b> (z. B. für eine Wohnung): online bestellen unter <a href="https://www.easygov.swiss" target="_blank" rel="noopener">easygov.swiss</a> oder direkt beim Betreibungsamt Ihrer Gemeinde.</p>
      <div class="fuss"><span></span><span class="aktionen"><button class="btn" data-f-zu2>Schliessen</button><button class="btn haupt" data-aktion="auszug">Auszug hochladen</button></span></div></div>`;
    dlg.onclick = (e) => { if (e.target.closest('[data-f-zu2]') || e.target.closest('[data-aktion=auszug]')) dlg.close(); };
    dlg.showModal();
  }

  /* ---------- Übersicht: zusätzliche Karten und Anpassen ---------- */
  const START_KARTEN = [['dringend', 'Jetzt wichtig (Fristen und Mahnungen)'], ['zahlen', 'Eingang, Ausgaben, Übrig, Abos'], ['naechste', 'Nächste fixe Zahlungen'], ['bargeld', 'Bargeld im Portemonnaie'],
    ['guthaben', 'Mir geschuldet'], ['sparen', 'Sparziele'], ['kalender', 'Nächste Termine'], ['ring', 'Wofür Ihr Geld weggeht'], ['rechnungen', 'Offene Rechnungen und Abos'], ['betreibungen', 'Betreibungen']];
  H.startStandard = { naechste: true, bargeld: true, guthaben: true, sparen: true, kalender: true };
  H.startExtra = (S) => {
    const d = D(), teile = [];
    if (S.naechste && d.fix.length) { const l = d.fix.map((f) => ({ ...f, n: naechstesDatum(f) })).filter((f) => f.n && f.n <= plusTage(H.heute(), 21)).sort((a, b) => (a.n < b.n ? -1 : 1)).slice(0, 5);
      teile.push(`<div class="card"><h2>Nächste fixe Zahlungen</h2>${l.map((f) => `<div class="zeile klick" data-tab="fix"><span><b>${H.esc(f.name)}</b><small>${H.dk(f.n)} · ${ART_FIX[f.art] || ''}</small></span><span class="betrag">${H.chf(f.betragRappen)}</span></div>`).join('') || '<p class="leer">In den nächsten 3 Wochen nichts.</p>'}</div>`); }
    if (S.bargeld && (d.bargeld.length || d.bewegungen.some((b) => b.kategorie === 'bargeld'))) { const s = bargeldStand(); teile.push(`<div class="card klick" data-tab="bargeld"><h2>Bargeld</h2><div class="zahl"><div class="w">${H.chf(s.bestand)}</div><div class="k">im Portemonnaie · ${H.chf(s.ausgegeben)} bar ausgegeben</div></div></div>`); }
    if (S.guthaben && d.guthaben.some((g) => offenG(g))) { const o = d.guthaben.filter((g) => offenG(g)); teile.push(`<div class="card klick" data-tab="guthaben"><h2>Mir geschuldet</h2><div class="zahl"><div class="w plus">${H.chf(o.reduce((s, g) => s + offenG(g), 0))}</div><div class="k">von ${[...new Set(o.map((g) => g.person))].slice(0, 3).map(H.esc).join(', ')}${o.length > 3 ? ' …' : ''}</div></div></div>`); }
    if (S.sparen && d.sparziele.length) teile.push(`<div class="card klick" data-tab="sparen"><h2>Sparziele</h2>${d.sparziele.slice(0, 3).map((z) => { const p = z.ziel ? Math.min(100, Math.round(gespart(z) / z.ziel * 100)) : 0; return `<div class="zeile"><span style="min-width:0"><b>${z.emoji || '🎯'} ${H.esc(z.name)}</b><small>${H.chf(gespart(z))} von ${H.chf(z.ziel)}</small><div class="spur"><i style="width:${p}%;background:${z.farbe || 'var(--gruen)'}"></i></div></span><span class="betrag">${p} %</span></div>`; }).join('')}</div>`);
    if (S.kalender) { const l = kalenderEintraege(H.heute(), plusTage(H.heute(), 14)).slice(0, 5); if (l.length) teile.push(`<div class="card"><h2>Nächste Termine</h2>${l.map((x) => `<div class="zeile klick" data-tab="kalender"><span><b>${H.esc(x.titel)}</b><small>${WT[new Date(x.datum + 'T12:00').getDay()]} ${H.dk(x.datum)}${x.zeit ? ' · ' + x.zeit : ''}</small></span></div>`).join('')}</div>`); }
    return teile.length ? `<div class="raster r2 abstand">${teile.join('')}</div>` : '';
  };
  H.dringendExtra = () => {
    const d = D(), l = [];
    for (const f of d.fix) if (f.art === 'manuell' || f.art === 'ebill') { const n = naechstesDatum(f); if (n && H.tageBis(n) <= 3) l.push({ t: `Selbst bezahlen: ${f.name} ${H.chf(f.betragRappen)}`, d: n, k: 'fix' }); }
    for (const g of d.guthaben) if (offenG(g) && g.faellig && g.faellig <= H.heute()) l.push({ t: `${g.person} schuldet Ihnen noch ${H.chf(offenG(g))}`, d: g.faellig, k: 'guthaben' });
    return l;
  };
  function startAnpassen() {
    const S = { dringend: true, zahlen: true, ring: true, rechnungen: true, betreibungen: true, ...H.startStandard, ...D().start };
    formular('Übersicht anpassen', `<p class="hinweis">Wählen Sie, was auf Ihrer Übersicht erscheint.</p><div style="display:grid;gap:8px">${START_KARTEN.map(([k, n]) => `<label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--tinte)"><input type="checkbox" name="${k}" ${S[k] ? 'checked' : ''}>${n}</label>`).join('')}</div>`,
      (fd) => { D().start = Object.fromEntries(START_KARTEN.map(([k]) => [k, fd.get(k) === 'on'])); H.sichern(); H.toast('Übersicht angepasst'); });
  }

  /* ---------- Ansichten anmelden und Bedienung ---------- */
  H.ansichten = { bargeld, fix, guthaben, sparen, kalender, dokumente, papierkorb };
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const a = t.closest('[data-hbm]');
    if (a) {
      const [was, arg] = a.dataset.hbm.split(':');
      ({ bargeld: () => barDialog(arg), fix: () => fixDialog(), guthaben: () => gutDialog(), sparziel: () => sparDialog(), kalEintrag: () => kalDialog(), ordnerNeu: () => ordnerDialog(), ordnerHoch: () => dateiWaehlen(true), dateiHoch: () => dateiWaehlen(false), startAnpassen, bankHilfe,
        fixVorschlag: () => { const d = D(); let n = 0; for (const ab of H.abosFinden().filter((x) => x.status !== 'gekuendigt')) { if (d.fix.some((f) => f.name.toLowerCase() === String(ab.name).toLowerCase())) continue; d.fix.push({ id: H.neueId(), name: ab.name, betragRappen: ab.betrag, tag: Number(String(ab.naechste || ab.letzter || '').slice(8, 10)) || 1, rhythmus: /jahr/i.test(ab.rhythmus) ? 12 : /quart|viertel/i.test(ab.rhythmus) ? 3 : 1, art: 'lsv', start: (ab.letzter || H.heute()).slice(0, 7) }); n++; } H.sichern(); H.zeichnen(); H.toast(n ? `${n} Zahlungen übernommen. Bitte prüfen.` : 'Keine neuen Vorschläge. Laden Sie Auszüge von 2 bis 3 Monaten hoch.'); },
        korbLeeren: async () => { if (!await UI.frage('Alles in „Zuletzt gelöscht“ endgültig löschen? Das kann nicht rückgängig gemacht werden.')) return; for (const p of D().papierkorb) await endgueltig(p); D().papierkorb = []; H.sichern(); H.zeichnen(); H.toast('Endgültig gelöscht'); },
      })[was]?.();
      return;
    }
    const gz = t.closest('[data-gz]'); if (gz && H._g) { H._g.zahlungen.splice(Number(gz.dataset.gz), 1); H.sichern(); H.toast('Rückzahlung gelöscht'); gutDialog(H._g); return; }
    const ez = t.closest('[data-ez]'); if (ez && H._z) { H._z.einzahlungen.splice(Number(ez.dataset.ez), 1); H.sichern(); H.toast('Einzahlung gelöscht'); sparDialog(H._z); return; }
    const bar = t.closest('[data-bar]'); if (bar && !t.closest('dialog')) { barDialog(null, D().bargeld.find((x) => x.id === bar.dataset.bar)); return; }
    const fx = t.closest('[data-fix]'); if (fx && !t.closest('dialog')) { fixDialog(D().fix.find((x) => x.id === fx.dataset.fix)); return; }
    const gu = t.closest('[data-gut]'); if (gu && !t.closest('dialog')) { gutDialog(D().guthaben.find((x) => x.id === gu.dataset.gut)); return; }
    const ein = t.closest('[data-einzahlen]'); if (ein) { e.stopPropagation(); einzahlen(D().sparziele.find((x) => x.id === ein.dataset.einzahlen)); return; }
    const sp = t.closest('[data-spar]'); if (sp && !t.closest('dialog')) { sparDialog(D().sparziele.find((x) => x.id === sp.dataset.spar)); return; }
    const kl = t.closest('[data-kal]'); if (kl) { const s = Number(kl.dataset.kal); if (!s) kalMonat = H.heute().slice(0, 7); else { const [j, m] = kalMonat.split('-').map(Number); kalMonat = new Date(j, m - 1 + s, 1, 12).toLocaleDateString('sv-SE').slice(0, 7); } H.zeichnen(); return; }
    const kt = t.closest('[data-kaltag]'); if (kt) { kalDialog(null, kt.dataset.kaltag); return; }
    const ke = t.closest('[data-kal-eintrag]'); if (ke && !t.closest('dialog')) { kalDialog(D().kalender.find((x) => x.id === ke.dataset.kalEintrag)); return; }
    const ic = t.closest('[data-ics]'); if (ic) { ics(D().kalender.find((x) => x.id === ic.dataset.ics)); return; }
    const og = t.closest('[data-ordner-gehe]'); if (og) { ordnerJetzt = og.dataset.ordnerGehe; H.zeichnen(); return; }
    const ob = t.closest('[data-ordner-bearb]'); if (ob) { ordnerDialog(D().ordner.find((x) => x.id === ob.dataset.ordnerBearb)); return; }
    const da = t.closest('[data-datei]'); if (da && !t.closest('dialog')) { dateiOeffnen(D().dokumente.find((x) => x.id === da.dataset.datei)); return; }
    const zu = t.closest('[data-zurueck]');
    if (zu) {
      const d = D(), p = d.papierkorb.find((x) => x.pid === zu.dataset.zurueck); if (!p) return;
      if (p.pfad === 'ordnerbaum') { d.ordner.push(...p.eintrag.ordner); d.dokumente.push(...p.eintrag.dokumente); }
      else H.listeSetzen(p.pfad, [...H.listeVon(p.pfad), p.eintrag]);
      d.papierkorb = d.papierkorb.filter((x) => x !== p); H.sichern(); H.zeichnen(); H.toast('Wiederhergestellt'); return;
    }
    const eg = t.closest('[data-endgueltig]');
    if (eg) { const d = D(), p = d.papierkorb.find((x) => x.pid === eg.dataset.endgueltig); if (!p || !await UI.frage(`„${p.titel}“ endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) return; await endgueltig(p); d.papierkorb = d.papierkorb.filter((x) => x !== p); H.sichern(); H.zeichnen(); H.toast('Endgültig gelöscht'); }
  });
  // Belegter Speicherplatz in der Ordner-Ansicht
  new MutationObserver(async () => { const e = document.getElementById('platz'); if (e && !e.dataset.ok) { e.dataset.ok = 1; try { const s = await navigator.storage.estimate(); e.textContent = `Belegt: ${groesse(s.usage || 0)} von ca. ${groesse(s.quota || 0)}.`; } catch {} } }).observe(document.documentElement, { childList: true, subtree: true });
})();
