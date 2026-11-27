// Home-Büro: Steuer-Assistent. Führt Schritt für Schritt durch die private Steuererklärung, nimmt alles aus dem
// Home-Büro mit (Abzüge, Kontoauszüge, Krankenkasse, Bargeld, Guthaben) und macht daraus eine Ausfüllhilfe plus
// Belege als PDF. Eingereicht wird im Online-Portal des Kantons (eine direkte Schnittstelle gibt es nur vereinzelt).
// Wird vor dem Hauptskript geladen und greift über window.HomeBuero zu.
(() => {
  'use strict';
  const H = (window.HomeBuero = window.HomeBuero || {});
  const D = () => H.daten;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chf = (r) => (H.chf ? H.chf(r) : ((r || 0) / 100).toFixed(2));
  const rp = (t) => { const n = H.betragLesen ? H.betragLesen(t) : Math.round(Number(t) * 100); return Number.isFinite(n) ? n : 0; };
  const ein = (r) => (r ? chf(r) : '');

  // Steuerverwaltung je Kanton (offizielle Seiten; dort liegt das Online-Portal). Frist: meistens 31. März.
  const KANTONE = [
    ['AG', 'Aargau', 'https://www.ag.ch/de/verwaltung/dfr/steuern'], ['AR', 'Appenzell Ausserrhoden', 'https://www.ar.ch/verwaltung/departement-finanzen/steuerverwaltung/'],
    ['AI', 'Appenzell Innerrhoden', 'https://www.ai.ch/themen/steuern'], ['BL', 'Basel-Landschaft', 'https://www.baselland.ch/politik-und-behorden/direktionen/finanz-und-kirchendirektion/steuerverwaltung'],
    ['BS', 'Basel-Stadt', 'https://www.steuerverwaltung.bs.ch/'], ['BE', 'Bern', 'https://www.sv.fin.be.ch/', '03-15'],
    ['FR', 'Freiburg', 'https://www.fr.ch/'], ['GE', 'Genf', 'https://www.ge.ch/'], ['GL', 'Glarus', 'https://www.gl.ch/verwaltung/finanzen-und-gesundheit/online-schalter.html/511'],
    ['GR', 'Graubünden', 'https://www.gr.ch/DE/institutionen/verwaltung/dfg/stv/steuererklaerung/'], ['JU', 'Jura', 'https://www.jura.ch/'],
    ['LU', 'Luzern', 'https://steuern.lu.ch/'], ['NE', 'Neuenburg', 'https://www.ne.ch/autorites/DFS/SCCO/'], ['NW', 'Nidwalden', 'https://www.steuern-nw.ch/'],
    ['OW', 'Obwalden', 'https://www.ow.ch/'], ['SG', 'St. Gallen', 'https://www.sg.ch/steuern-finanzen/steuern.html'], ['SH', 'Schaffhausen', 'https://sh.ch/'],
    ['SZ', 'Schwyz', 'https://www.sz.ch/etax'], ['SO', 'Solothurn', 'https://so.ch/verwaltung/finanzdepartement/steueramt/'], ['TI', 'Tessin', 'https://www.ti.ch/'],
    ['TG', 'Thurgau', 'https://steuerverwaltung.tg.ch/'], ['UR', 'Uri', 'https://www.ur.ch/'], ['VD', 'Waadt', 'https://www.vd.ch/etat-droit-finances/impots'],
    ['VS', 'Wallis', 'https://www.vs.ch/de/web/scc'], ['ZG', 'Zug', 'https://zg.ch/de/steuern-finanzen/steuern'], ['ZH', 'Zürich', 'https://www.zh.ch/de/steuern-finanzen/steuern.html'],
  ];
  const kanton = (k) => KANTONE.find((x) => x[0] === k);
  const SCHRITTE = [['kanton', 'Kanton und Frist'], ['person', 'Über Sie'], ['einkommen', 'Einkommen'], ['beruf', 'Arbeitsweg und Beruf'], ['abzuege', 'Abzüge'], ['vermoegen', 'Vermögen und Schulden'], ['fertig', 'Ausfüllhilfe']];

  let jahr = String(new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0));
  const S = () => {
    const d = D(); d.steuerErkl = d.steuerErkl || {};
    return (d.steuerErkl[jahr] = d.steuerErkl[jahr] || { schritt: 0, kanton: '', frist: '', zivil: 'ledig', kinder: 0, wohnen: 'miete', konfession: '',
      arbeitsweg: { km: '', mittel: 'oev', tage: 220 }, verpflegung: 'keine', lohn: [], weitere: [], selbst: 0,
      konten: [], bar: 0, fahrzeug: 0, wertschriften: 0, schulden: [], schuldzinsen: 0, bvgEinkauf: 0, korrektur: {}, eingereicht: '' });
  };
  const fristVorschlag = (k) => `${Number(jahr) + 1}-${(kanton(k) || [])[3] || '03-31'}`;

  /* ---------- Zahlen aus dem Home-Büro ---------- */
  const imJahr = (d) => String(d || '').slice(0, 4) === jahr;
  function gesammelt() {
    const l = (D().steuern || []).filter((s) => imJahr(s.datum));
    const sum = (art) => l.filter((s) => s.art === art).reduce((a, s) => a + (s.betragRappen || 0), 0);
    const kk = (D().kk && D().kk.aktuell) || {};
    const kkJahr = (kk.praemieRappen || 0) * 12;
    const lohnKonto = (D().bewegungen || []).filter((b) => imJahr(b.datum) && b.kategorie === 'lohn' && b.betragRappen > 0).reduce((a, b) => a + b.betragRappen, 0);
    const guthaben = (D().guthaben || []).reduce((a, g) => a + Math.max(0, (g.betragRappen || 0) - (g.zahlungen || []).reduce((t, z) => t + z.betragRappen, 0)), 0);
    const offeneRg = (D().rechnungen || []).filter((r) => r.status !== 'bezahlt' && String(r.erhalten || r.faellig || '') <= jahr + '-12-31').reduce((a, r) => a + (r.betragRappen || 0), 0);
    const auszuege = (D().importe || []).filter((i) => i.saldoEnde != null && i.bis && i.bis <= jahr + '-12-31' && i.bis >= jahr + '-01-01');
    return { l, sum, kk, kkJahr, lohnKonto, guthaben, offeneRg, auszuege };
  }
  // Endwert je Abzug: was gesammelt ist, ausser der Nutzer hat es im Assistenten geändert
  function abzugWert(id, g) {
    const s = S();
    if (s.korrektur[id] != null) return s.korrektur[id];
    if (id === 'versicherung') return g.sum('versicherung') || g.kkJahr;
    return g.sum(id);
  }

  /* ---------- Ansicht ---------- */
  const feld = (label, inhalt, hinweis = '') => `<label class="se-feld"><span>${label}</span>${inhalt}${hinweis ? `<small>${hinweis}</small>` : ''}</label>`;
  const chfFeld = (pfad, wert, ph = '0.00') => `<input type="text" inputmode="decimal" data-se-chf="${pfad}" value="${ein(wert)}" placeholder="${ph}">`;
  const wahl = (pfad, wert, optionen) => `<select data-se="${pfad}">${optionen.map(([v, n]) => `<option value="${v}" ${String(wert) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;

  function schrittInhalt(s, g) {
    const k = kanton(s.kanton);
    switch (SCHRITTE[s.schritt][0]) {
      case 'kanton': return `
        <p>In welchem Kanton wohnten Sie am 31. Dezember ${jahr}? Dort reichen Sie die Steuererklärung ein.</p>
        ${feld('Kanton', wahl('kanton', s.kanton, [['', 'Bitte wählen'], ...KANTONE.map(([id, n]) => [id, n])]))}
        ${feld('Frist laut Ihrem Formular', `<input type="date" data-se="frist" value="${esc(s.frist || (s.kanton ? fristVorschlag(s.kanton) : ''))}">`, 'Meistens der 31. März, in Bern oft der 15. März. Das genaue Datum steht auf dem Brief mit Ihrem Zugangscode.')}
        <div class="se-knoepfe"><button class="btn" data-se-aktion="erinnerung">Erinnerung in den Kalender</button>${k ? `<a class="btn" href="${k[2]}" target="_blank" rel="noopener">Steuerverwaltung ${esc(k[1])}</a>` : ''}</div>
        <div class="info-box">Zu knapp? Eine Fristverlängerung beantragen Sie online bei Ihrer Steuerverwaltung, oft gratis bis in den Herbst. Wichtig: vor Ablauf der Frist.</div>`;
      case 'person': return `
        <div class="se-zwei">${feld('Zivilstand am 31.12.', wahl('zivil', s.zivil, [['ledig', 'ledig'], ['verheiratet', 'verheiratet / eingetragene Partnerschaft'], ['geschieden', 'geschieden'], ['getrennt', 'getrennt'], ['verwitwet', 'verwitwet']]))}
        ${feld('Kinder (unterstützt)', `<input type="number" min="0" max="12" data-se="kinder" value="${esc(s.kinder)}">`)}</div>
        <div class="se-zwei">${feld('Wohnen', wahl('wohnen', s.wohnen, [['miete', 'Miete'], ['eigentum', 'Eigentum (selbst bewohnt)'], ['eltern', 'bei den Eltern / gratis']]))}
        ${feld('Konfession (Kirchensteuer)', wahl('konfession', s.konfession, [['', 'keine / ausgetreten'], ['ref', 'reformiert'], ['kath', 'römisch-katholisch'], ['christkath', 'christkatholisch'], ['andere', 'andere']]))}</div>
        ${s.zivil === 'verheiratet' ? '<div class="info-box">Verheiratete füllen eine gemeinsame Steuererklärung aus. Tragen Sie in den nächsten Schritten das Einkommen von beiden ein.</div>' : ''}
        ${s.wohnen === 'eigentum' ? '<div class="info-box">Mit Wohneigentum kommen Eigenmietwert, Hypothekarzinsen und Unterhaltskosten dazu. Den Eigenmietwert finden Sie in der letzten Veranlagung oder Schätzung.</div>' : ''}`;
      case 'einkommen': return `
        <p>Pro Arbeitgeber einen Lohnausweis. Am schnellsten: fotografieren, Ordasio liest die Zahlen.</p>
        <div class="se-knoepfe"><button class="btn haupt" data-se-aktion="lohnFoto">Lohnausweis fotografieren oder PDF</button><button class="btn" data-se-aktion="lohnNeu">Von Hand erfassen</button></div>
        ${s.lohn.map((l, i) => `<div class="card se-karte"><div class="se-kopf"><b>${esc(l.arbeitgeber || 'Lohnausweis ' + (i + 1))}</b><button class="btn klein" data-se-weg="lohn" data-i="${i}">Entfernen</button></div>
          <div class="se-zwei">${feld('Arbeitgeber', `<input type="text" data-se-l="lohn" data-i="${i}" data-f="arbeitgeber" value="${esc(l.arbeitgeber || '')}">`)}${feld('Nettolohn (Ziffer 11)', `<input type="text" inputmode="decimal" data-se-lchf="lohn" data-i="${i}" data-f="netto" value="${ein(l.netto)}">`)}</div>
          <div class="se-zwei">${feld('Bruttolohn (Ziffer 8)', `<input type="text" inputmode="decimal" data-se-lchf="lohn" data-i="${i}" data-f="brutto" value="${ein(l.brutto)}">`)}${feld('Pensionskasse (Ziffer 10.1)', `<input type="text" inputmode="decimal" data-se-lchf="lohn" data-i="${i}" data-f="bvg" value="${ein(l.bvg)}">`)}</div>
          <div class="se-zwei">${feld('Einkauf Pensionskasse (Ziffer 10.2)', `<input type="text" inputmode="decimal" data-se-lchf="lohn" data-i="${i}" data-f="bvgEinkauf" value="${ein(l.bvgEinkauf)}">`)}${feld('Quellensteuer (Ziffer 12)', `<input type="text" inputmode="decimal" data-se-lchf="lohn" data-i="${i}" data-f="quellensteuer" value="${ein(l.quellensteuer)}">`)}</div>
          <div class="se-zwei se-haken"><label><input type="checkbox" data-se-lbool="lohn" data-i="${i}" data-f="feldF" ${l.feldF ? 'checked' : ''}> Feld F angekreuzt (Gratis-Transport zur Arbeit)</label><label><input type="checkbox" data-se-lbool="lohn" data-i="${i}" data-f="feldG" ${l.feldG ? 'checked' : ''}> Feld G angekreuzt (Kantine / Lunch-Checks)</label></div></div>`).join('')}
        ${g.lohnKonto ? `<p class="hinweis">Zum Vergleich: Lohneingänge ${jahr} laut Ihren Kontoauszügen CHF ${chf(g.lohnKonto)}. Massgebend ist der Lohnausweis.</p>` : ''}
        <h3 class="se-h3">Weitere Einkünfte</h3>
        <p class="hinweis">Zum Beispiel Nebenjob ohne Lohnausweis, AHV-/IV-Rente, Taggelder, Arbeitslosengeld, Alimente, Mieteinnahmen.</p>
        ${s.weitere.map((w, i) => `<div class="se-zeile">${`<input type="text" data-se-l="weitere" data-i="${i}" data-f="art" value="${esc(w.art || '')}" placeholder="Art, z. B. Taggeld">`}<input type="text" inputmode="decimal" data-se-lchf="weitere" data-i="${i}" data-f="betrag" value="${ein(w.betrag)}" placeholder="CHF"><button class="btn klein" data-se-weg="weitere" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('')}
        <button class="btn klein" data-se-aktion="weitereNeu">+ Einkunft</button>
        ${feld('Gewinn aus selbständiger Tätigkeit (falls vorhanden)', chfFeld('selbst', s.selbst), 'Aus der Erfolgsrechnung Ihrer Einzelfirma. Die Erfolgsrechnung legen Sie bei.')}`;
      case 'beruf': return `
        <p>Arbeitsweg und Verpflegung bringen oft die grössten Abzüge. Die Beträge rechnet das Steuerprogramm Ihres Kantons, Sie brauchen nur die Angaben.</p>
        <div class="se-zwei">${feld('Arbeitsweg, Kilometer einfach', `<input type="number" min="0" step="0.1" data-se="arbeitsweg.km" value="${esc(s.arbeitsweg.km)}">`)}${feld('Womit?', wahl('arbeitsweg.mittel', s.arbeitsweg.mittel, [['oev', 'Öffentlicher Verkehr'], ['auto', 'Auto'], ['motorrad', 'Motorrad'], ['velo', 'Velo / zu Fuss'], ['geschaeft', 'Geschäftsauto']]))}</div>
        <div class="se-zwei">${feld('Arbeitstage im Jahr', `<input type="number" min="0" max="365" data-se="arbeitsweg.tage" value="${esc(s.arbeitsweg.tage)}">`, 'Vollzeit meist 220')}${feld('Mittagessen', wahl('verpflegung', s.verpflegung, [['keine', 'zu Hause / kein Abzug'], ['auswaerts', 'auswärts, selbst bezahlt'], ['kantine', 'Kantine / vergünstigt']]))}</div>
        ${s.arbeitsweg.mittel === 'oev' ? '<p class="hinweis">Abzug: Kosten für Abo oder Billette. Gesammelt unter Abzüge › Berufsauslagen zählen dazu.</p>' : ''}
        ${s.arbeitsweg.mittel === 'auto' ? '<p class="hinweis">Mit dem Auto verlangt das Steueramt oft eine Begründung (z. B. kein ÖV, Schichtarbeit, Zeitersparnis über eine Stunde).</p>' : ''}`;
      case 'abzuege': {
        const reihe = (H.ABZUG || []).filter(([id]) => id !== 'beruf');
        return `<p>Gesammelt im Home-Büro, Sie können jeden Betrag anpassen.</p>
          ${reihe.map(([id, n]) => { const w = abzugWert(id, g); return `<div class="se-zeile se-abzug"><span>${esc(n)}${id === 'versicherung' && !g.sum('versicherung') && g.kkJahr ? `<small>Krankenkasse ${chf(g.kk.praemieRappen)} × 12</small>` : ''}${id === 'krankheit' ? '<small>zählt nur über dem Selbstbehalt Ihres Kantons</small>' : ''}</span><input type="text" inputmode="decimal" data-se-abzug="${id}" value="${ein(w)}" placeholder="0.00"></div>`; }).join('')}
          <div class="se-zeile se-abzug"><span>Berufsauslagen (ÖV-Abo, Material)<small>gesammelt</small></span><input type="text" inputmode="decimal" data-se-abzug="beruf" value="${ein(abzugWert('beruf', g))}" placeholder="0.00"></div>
          <p class="hinweis">Fehlt etwas? Unter Planen › Abzüge sammeln Sie Belege mit Foto, auch Vorschläge aus dem Kontoauszug.</p>`;
      }
      case 'vermoegen': return `
        <p>Saldo aller Konten am 31.12.${jahr}. Den genauen Wert nehmen Sie vom Zins- und Saldoausweis der Bank.</p>
        ${g.auszuege.length ? `<div class="info-box"><b>Aus Ihren Kontoauszügen:</b>${g.auszuege.map((a) => `<div class="se-zeile"><span>${esc(a.name)}<small>Saldo am ${H.dk ? H.dk(a.bis) : a.bis}</small></span><b>CHF ${chf(a.saldoEnde)}</b><button class="btn klein" data-se-uebernehmen="${esc(a.id)}">Übernehmen</button></div>`).join('')}</div>` : ''}
        ${s.konten.map((k, i) => `<div class="se-zeile"><input type="text" data-se-l="konten" data-i="${i}" data-f="bank" value="${esc(k.bank || '')}" placeholder="Bank und Konto"><input type="text" inputmode="decimal" data-se-lchf="konten" data-i="${i}" data-f="saldo" value="${ein(k.saldo)}" placeholder="Saldo CHF"><button class="btn klein" data-se-weg="konten" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('')}
        <button class="btn klein" data-se-aktion="kontoNeu">+ Konto</button>
        <div class="se-zwei">${feld('Bargeld (über ca. CHF 1000)', chfFeld('bar', s.bar))}${feld('Auto, Motorrad (heutiger Wert)', chfFeld('fahrzeug', s.fahrzeug))}</div>
        <div class="se-zwei">${feld('Wertschriften, Aktien, Krypto', chfFeld('wertschriften', s.wertschriften), 'laut Depotauszug per 31.12.')}${feld('Guthaben bei anderen', `<input type="text" readonly value="${ein(g.guthaben)}">`, 'aus «Mir geschuldet»')}</div>
        <h3 class="se-h3">Schulden per 31.12.</h3>
        ${g.offeneRg ? `<p class="hinweis">Offene Rechnungen im Home-Büro: CHF ${chf(g.offeneRg)}</p>` : ''}
        ${s.schulden.map((k, i) => `<div class="se-zeile"><input type="text" data-se-l="schulden" data-i="${i}" data-f="glaeubiger" value="${esc(k.glaeubiger || '')}" placeholder="Gläubiger, z. B. Kredit, Leasing"><input type="text" inputmode="decimal" data-se-lchf="schulden" data-i="${i}" data-f="betrag" value="${ein(k.betrag)}" placeholder="CHF"><button class="btn klein" data-se-weg="schulden" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('')}
        <button class="btn klein" data-se-aktion="schuldNeu">+ Schuld</button>
        ${feld('Bezahlte Schuldzinsen im Jahr', chfFeld('schuldzinsen', s.schuldzinsen))}`;
      default: return ausfuellhilfe(s, g, false);
    }
  }

  // Zusammenstellung in der Reihenfolge der Steuererklärung (für Bildschirm und Druck)
  function ausfuellhilfe(s, g, druck) {
    const k = kanton(s.kanton);
    const z = (n, w, extra = '') => `<tr><td>${n}${extra ? `<small>${extra}</small>` : ''}</td><td class="r">${typeof w === 'number' ? 'CHF ' + chf(w) : esc(w)}</td></tr>`;
    const netto = s.lohn.reduce((a, l) => a + (l.netto || 0), 0);
    const weitere = s.weitere.reduce((a, w) => a + (w.betrag || 0), 0);
    const konten = s.konten.reduce((a, x) => a + (x.saldo || 0), 0);
    const verm = konten + (s.bar || 0) + (s.fahrzeug || 0) + (s.wertschriften || 0) + g.guthaben;
    const schulden = s.schulden.reduce((a, x) => a + (x.betrag || 0), 0);
    const bvgEinkauf = s.lohn.reduce((a, l) => a + (l.bvgEinkauf || 0), 0);
    const ZIV = { ledig: 'ledig', verheiratet: 'verheiratet', geschieden: 'geschieden', getrennt: 'getrennt', verwitwet: 'verwitwet' };
    const MIT = { oev: 'öffentlicher Verkehr', auto: 'Auto', motorrad: 'Motorrad', velo: 'Velo / zu Fuss', geschaeft: 'Geschäftsauto' };
    const VER = { keine: 'kein Abzug', auswaerts: 'auswärts, selbst bezahlt', kantine: 'Kantine / vergünstigt' };
    const abz = (H.ABZUG || []).map(([id, n]) => [n, abzugWert(id, g)]).filter(([, w]) => w);
    const tab = (titel, inhalt) => inhalt ? `<h3 class="se-h3">${titel}</h3><table class="se-tab">${inhalt}</table>` : '';
    const html = `${druck ? '' : `<div class="info-box">So geht es weiter: Öffnen Sie das Online-Portal Ihres Kantons mit dem Zugangscode von Ihrem Brief und übertragen Sie die Werte unten der Reihe nach. Die Belege laden Sie als PDF hoch oder legen sie bei.</div>`}
      ${tab('Persönliches', z('Kanton', k ? k[1] : '–') + z('Zivilstand', ZIV[s.zivil] || s.zivil) + z('Kinder', String(s.kinder || 0)) + z('Wohnen', s.wohnen === 'eigentum' ? 'Eigentum' : s.wohnen === 'eltern' ? 'bei den Eltern / gratis' : 'Miete') + (s.konfession ? z('Konfession', { ref: 'reformiert', kath: 'römisch-katholisch', christkath: 'christkatholisch', andere: 'andere' }[s.konfession]) : ''))}
      ${tab('Einkommen', s.lohn.map((l) => z('Nettolohn ' + (l.arbeitgeber || ''), l.netto || 0, 'Lohnausweis Ziffer 11' + (l.quellensteuer ? ` · Quellensteuer CHF ${chf(l.quellensteuer)}` : ''))).join('') + s.weitere.filter((w) => w.betrag).map((w) => z(w.art || 'Weitere Einkunft', w.betrag)).join('') + (s.selbst ? z('Selbständige Tätigkeit (Gewinn)', s.selbst, 'Erfolgsrechnung beilegen') : '') + (netto + weitere + (s.selbst || 0) ? z('<b>Total Einkünfte</b>', netto + weitere + (s.selbst || 0)) : ''))}
      ${tab('Berufsauslagen', (s.arbeitsweg.km ? z('Arbeitsweg', `${s.arbeitsweg.km} km einfach, ${MIT[s.arbeitsweg.mittel] || ''}, ${s.arbeitsweg.tage || 220} Tage`) : '') + z('Verpflegung', VER[s.verpflegung] || '–', s.lohn.some((l) => l.feldG) ? 'Feld G angekreuzt: reduzierter Abzug' : '') + (s.lohn.some((l) => l.feldF) ? z('Gratis-Transport (Feld F)', 'ja, kein Abzug für den Arbeitsweg') : '') + (abzugWert('beruf', g) ? z('Belege Berufsauslagen', abzugWert('beruf', g)) : ''))}
      ${tab('Abzüge', abz.filter(([n]) => !/^Berufsauslagen/.test(n)).map(([n, w]) => z(n, w)).join('') + (bvgEinkauf ? z('Einkauf Pensionskasse', bvgEinkauf, 'Lohnausweis Ziffer 10.2') : '') + (s.schuldzinsen ? z('Schuldzinsen', s.schuldzinsen) : ''))}
      ${tab('Vermögen per 31.12.' + jahr, s.konten.map((x) => z(x.bank || 'Konto', x.saldo || 0)).join('') + (s.bar ? z('Bargeld', s.bar) : '') + (s.fahrzeug ? z('Fahrzeuge', s.fahrzeug) : '') + (s.wertschriften ? z('Wertschriften', s.wertschriften) : '') + (g.guthaben ? z('Guthaben bei anderen', g.guthaben) : '') + (verm ? z('<b>Total Vermögen</b>', verm) : ''))}
      ${tab('Schulden per 31.12.' + jahr, s.schulden.map((x) => z(x.glaeubiger || 'Schuld', x.betrag || 0)).join('') + (schulden ? z('<b>Total Schulden</b>', schulden) : ''))}
      <h3 class="se-h3">Beilagen</h3><ul class="se-liste">${['Lohnausweis(e)', 'Zins- und Saldoausweise aller Konten per 31.12.', g.sum('saeule3a') ? 'Bescheinigung Säule 3a' : '', abzugWert('versicherung', g) ? 'Prämienübersicht Krankenkasse' : '', g.sum('krankheit') ? 'Arzt- und Apothekenrechnungen' : '', g.sum('spenden') ? 'Spendenbestätigungen' : '', g.sum('kinder') ? 'Belege Kinderbetreuung' : '', s.wertschriften ? 'Depotauszug' : '', s.selbst ? 'Erfolgsrechnung der Einzelfirma' : '', s.schulden.length ? 'Schuldenausweise' : ''].filter(Boolean).map((x) => `<li>${x}</li>`).join('')}</ul>
      <p class="hinweis">Allgemeine Hilfe ohne Gewähr. Abzüge und Grenzen bestimmt Ihr Kanton, massgebend ist dessen Wegleitung.</p>`;
    if (druck) return html;
    return html + `<div class="se-knoepfe"><button class="btn haupt" data-se-aktion="drucken">Ausfüllhilfe und Belege als PDF</button>${k ? `<a class="btn" href="${k[2]}" target="_blank" rel="noopener">Zum Steuerportal ${esc(k[1])}</a>` : ''}</div>
      <div class="card se-karte">${s.eingereicht ? `<b>✓ Eingereicht am ${H.dk ? H.dk(s.eingereicht) : s.eingereicht}</b><p class="hinweis">Kommt die Veranlagung, vergleichen Sie sie mit dieser Ausfüllhilfe. Für eine Einsprache haben Sie meist 30 Tage.</p><button class="btn klein" data-se-aktion="nichtEingereicht">Doch noch nicht eingereicht</button>`
        : `<b>Fertig im Portal eingereicht?</b><p class="hinweis">Markieren Sie es hier, dann erinnert Ordasio nicht mehr an die Frist.</p><button class="btn" data-se-aktion="eingereicht">Als eingereicht markieren</button>`}</div>`;
  }

  function ansicht() {
    const s = S(), g = gesammelt();
    const jahre = [...new Set([jahr, String(new Date().getFullYear() - 1), String(new Date().getFullYear()), ...Object.keys(D().steuerErkl || {})])].sort().reverse();
    const n = SCHRITTE.length, i = Math.min(s.schritt, n - 1);
    setTimeout(() => { const a = document.querySelector('.se-weg .an'); if (a) a.parentElement.scrollLeft = a.offsetLeft - 20; }, 0);
    return `<div class="kopf"><div><h1>Steuererklärung ${jahr}</h1><p class="unter">Schritt für Schritt vorbereiten. Ordasio nimmt alles mit, was schon im Home-Büro ist, und macht daraus eine Ausfüllhilfe für das Online-Portal Ihres Kantons.</p></div>
        <div class="aktionen"><select data-se-jahr>${jahre.map((j) => `<option ${j === jahr ? 'selected' : ''}>${j}</option>`).join('')}</select></div></div>
      <div class="se-weg">${SCHRITTE.map(([, t], x) => `<button class="${x === i ? 'an' : ''} ${x < i ? 'fertig' : ''}" data-se-schritt="${x}"><i>${x < i ? '✓' : x + 1}</i><span>${t}</span></button>`).join('')}</div>
      <div class="card se-schritt"><h2>${i + 1}. ${SCHRITTE[i][1]}</h2>${schrittInhalt(s, g)}
        <div class="se-fuss">${i > 0 ? '<button class="btn" data-se-schritt="' + (i - 1) + '">Zurück</button>' : '<span></span>'}${i < n - 1 ? `<button class="btn haupt" data-se-schritt="${i + 1}">Weiter</button>` : ''}</div></div>`;
  }

  /* ---------- Bedienung ---------- */
  const setze = (obj, pfad, wert) => { const t = pfad.split('.'); let o = obj; while (t.length > 1) { const k = t.shift(); o = o[k] = o[k] || {}; } o[t[0]] = wert; };
  const neuZeichnen = () => { H.sichern(); H.zeichnen(); };
  document.addEventListener('change', (e) => {
    const t = e.target; if (!t.closest || !t.closest('.se-schritt, .kopf')) return;
    const s = S();
    if (t.matches('[data-se-jahr]')) { jahr = t.value; H.zeichnen(); return; }
    if (t.matches('[data-se]')) { const num = t.type === 'number'; setze(s, t.dataset.se, num ? Number(t.value || 0) : t.value); if (t.dataset.se === 'kanton' && !s.frist && t.value) s.frist = fristVorschlag(t.value); neuZeichnen(); return; }
    if (t.matches('[data-se-chf]')) { setze(s, t.dataset.seChf, rp(t.value)); H.sichern(); t.value = ein(rp(t.value)); return; }
    if (t.matches('[data-se-abzug]')) { s.korrektur[t.dataset.seAbzug] = rp(t.value); H.sichern(); t.value = ein(rp(t.value)); return; }
    const liste = t.dataset.seL || t.dataset.seLchf || t.dataset.seLbool;
    if (liste) {
      const x = s[liste][Number(t.dataset.i)]; if (!x) return;
      x[t.dataset.f] = t.dataset.seLbool ? t.checked : t.dataset.seLchf ? rp(t.value) : t.value;
      H.sichern(); if (t.dataset.seLchf) t.value = ein(x[t.dataset.f]); if (t.dataset.f === 'arbeitgeber') H.zeichnen();
    }
  });
  async function lohnLesen() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      H.toast('Lohnausweis wird gelesen …');
      let r = null; try { r = window.Leser && Leser.ki ? await Leser.ki(f, 'lohnausweis') : null; } catch { r = null; }
      const v = (r && r.felder) || {};
      const z = (x) => (Number.isFinite(Number(x)) && x !== '' && x != null ? Math.round(Number(x) * 100) : 0);
      const l = { arbeitgeber: v.arbeitgeber || '', brutto: z(v.bruttolohn), netto: z(v.nettolohn), bvg: z(v.bvg_beitraege), bvgEinkauf: z(v.bvg_einkauf), quellensteuer: z(v.quellensteuer), feldF: !!v.feld_f, feldG: !!v.feld_g };
      if (f.type.startsWith('image/') && H.bildKlein) { try { l.foto = await H.bildKlein(f); } catch { /* ohne Foto */ } }
      S().lohn.push(l); neuZeichnen();
      if (r && r.felder && l.netto) H.toast('Gelesen. Bitte die Zahlen kurz prüfen.');
      else H.toast(r && r.fehler ? r.fehler + ' Bitte von Hand ergänzen.' : 'Nicht automatisch lesbar. Bitte die Zahlen von Hand eintragen.');
    };
    inp.click();
  }
  function erinnerung() {
    const s = S(); if (!s.frist) { H.toast('Bitte zuerst die Frist eintragen'); return; }
    const vor = new Date(s.frist + 'T12:00'); vor.setDate(vor.getDate() - 14);
    const k = D().kalender || (D().kalender = []);
    const titel = `Steuererklärung ${jahr} einreichen`;
    if (!k.some((x) => x.titel === titel && x.datum === s.frist)) k.push({ id: H.neueId(), datum: s.frist, titel, notiz: 'Frist läuft ab. Verlängerung vorher online beantragen.' });
    const t2 = `Steuererklärung ${jahr}: noch 2 Wochen`, d2 = vor.toLocaleDateString('sv-SE');
    if (!k.some((x) => x.titel === t2)) k.push({ id: H.neueId(), datum: d2, titel: t2, notiz: 'Im Home-Büro unter Planen › Steuererklärung' });
    H.sichern(); H.toast('Im Kalender eingetragen');
  }
  function drucken() {
    const s = S(), g = gesammelt(), k = kanton(s.kanton);
    const fotos = [...g.l.filter((x) => x.foto).map((x) => [x.text || 'Beleg', x.foto]), ...s.lohn.filter((x) => x.foto).map((x) => ['Lohnausweis ' + (x.arbeitgeber || ''), x.foto])];
    const w = window.open('', '_blank'); if (!w) { H.toast('Bitte Pop-ups erlauben'); return; }
    w.document.write(`<html><head><title>Steuererklärung ${jahr}${k ? ' · ' + esc(k[1]) : ''}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:11pt -apple-system,system-ui,sans-serif;padding:18px;color:#111}h1{font-size:20pt;margin:0 0 4px}h3{font-size:12pt;margin:18px 0 6px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:5px 4px;vertical-align:top}td small{display:block;color:#666;font-size:9pt}.r{text-align:right;white-space:nowrap}.hinweis{color:#666;font-size:9pt}figure{page-break-inside:avoid;margin:14px 0}figure img{max-width:100%;max-height:900px}figcaption{font-size:9pt;color:#666}</style></head><body>
      <h1>Steuererklärung ${jahr}</h1><p class="hinweis">Ausfüllhilfe aus Ordasio · ${new Date().toLocaleDateString('de-CH')}</p>${ausfuellhilfe(s, g, true)}
      ${fotos.length ? `<h3>Belege</h3>${fotos.map(([t, f]) => `<figure><img src="${f}"><figcaption>${esc(t)}</figcaption></figure>`).join('')}` : ''}
      <script>setTimeout(()=>print(),400)<\/script></body></html>`);
    w.document.close();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-se-schritt],[data-se-aktion],[data-se-weg],[data-se-uebernehmen]'); if (!t) return;
    const s = S();
    if (t.dataset.seSchritt != null) { s.schritt = Number(t.dataset.seSchritt); neuZeichnen(); window.scrollTo(0, 0); return; }
    if (t.dataset.seWeg) { s[t.dataset.seWeg].splice(Number(t.dataset.i), 1); neuZeichnen(); return; }
    if (t.dataset.seUebernehmen) {
      const a = (D().importe || []).find((x) => x.id === t.dataset.seUebernehmen); if (!a) return;
      s.konten.push({ bank: a.name.replace(/\.(pdf|csv|xml|xlsx?)$/i, ''), saldo: a.saldoEnde }); neuZeichnen(); return;
    }
    ({ lohnFoto: lohnLesen, lohnNeu: () => { s.lohn.push({}); neuZeichnen(); }, weitereNeu: () => { s.weitere.push({}); neuZeichnen(); }, kontoNeu: () => { s.konten.push({}); neuZeichnen(); },
      schuldNeu: () => { s.schulden.push({}); neuZeichnen(); }, erinnerung, drucken,
      eingereicht: () => { s.eingereicht = H.heute ? H.heute() : new Date().toLocaleDateString('sv-SE'); neuZeichnen(); H.toast('Gut gemacht!'); },
      nichtEingereicht: () => { s.eingereicht = ''; neuZeichnen(); } })[t.dataset.seAktion]?.();
  });

  // Stil
  const st = document.createElement('style');
  st.textContent = `.se-weg{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 14px;padding-bottom:2px}.se-weg::-webkit-scrollbar{display:none}
    .se-weg button{flex:none;display:flex;align-items:center;gap:7px;border:1px solid var(--linie,#E1E9E5);background:#fff;border-radius:100px;padding:6px 12px 6px 6px;font:inherit;font-size:13.5px;color:var(--text,#3F5A4F);cursor:pointer;white-space:nowrap}
    .se-weg i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700;background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E)}
    .se-weg button.an{border-color:var(--blau,#0B3B2E);color:var(--blau,#0B3B2E);font-weight:600}.se-weg button.an i{background:var(--blau,#0B3B2E);color:#fff}
    .se-weg button.fertig i{background:var(--elektrik,#0E7A55);color:#fff}
    .se-schritt h2{margin-top:0}.se-schritt p{margin:0 0 12px}.se-feld{display:grid;gap:5px;margin:0 0 12px;min-width:0}.se-feld>span{font-size:13.5px;font-weight:600;color:var(--tinte,#0A1F17)}.se-feld small{color:var(--leise,#7C8499);font-size:12.5px}
    .se-feld input,.se-feld select,.se-zeile input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--linie,#E1E9E5);border-radius:12px;padding:10px 12px;font:inherit;background:#fff}
    .se-zwei{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(max-width:560px){.se-zwei{grid-template-columns:minmax(0,1fr)}}
    .se-knoepfe{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}.se-knoepfe a.btn{text-decoration:none;display:inline-flex;align-items:center}
    .se-karte{margin:10px 0;padding:14px}.se-kopf{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
    .se-haken label{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--text,#3F5A4F)}
    .se-zeile{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto;gap:8px;align-items:center;margin:0 0 8px}
    .se-zeile.se-abzug{grid-template-columns:minmax(0,1fr) 130px;padding:8px 0;border-bottom:1px solid var(--linie,#E1E9E5);margin:0}.se-zeile span small{display:block;color:var(--leise,#7C8499);font-size:12px}
    .info-box .se-zeile{grid-template-columns:minmax(0,1fr) auto auto;margin:8px 0 0}
    .se-h3{font-size:15px;margin:18px 0 6px}.se-tab{width:100%;border-collapse:collapse}.se-tab td{padding:8px 4px;border-bottom:1px solid var(--linie,#E1E9E5);vertical-align:top}.se-tab td small{display:block;color:var(--leise,#7C8499);font-size:12px}.se-tab .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
    .se-liste{margin:0 0 10px;padding-left:20px}.se-fuss{display:flex;justify-content:space-between;gap:10px;margin-top:16px;padding-top:12px;border-top:1px solid var(--linie,#E1E9E5)}`;
  document.head.appendChild(st);

  H.ansichten = Object.assign(H.ansichten || {}, { steuererklaerung: ansicht });
  H.steuerAssistentStatus = () => { const s = D() && D().steuerErkl && D().steuerErkl[jahr]; return { jahr, schritt: s ? s.schritt : 0, von: SCHRITTE.length, eingereicht: s ? s.eingereicht : '', frist: s ? s.frist : '' }; };
})();
