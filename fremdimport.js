/* Ordasio – Buchhaltung aus anderen Programmen übernehmen (bexio, Banana, Abacus, AbaNinja, Run my Accounts, Klara, Sage, Excel).
   Zwei Wege: 1. Saldenliste oder Schlussbilanz → Eröffnungsbilanz. 2. Journal (alle Buchungen eines Zeitraums) → Journal in Ordasio.
   Datei (CSV, TXT, Excel) oder einfach die Tabelle hineinkopieren (z. B. aus Banana). Die Spalten erkennt Ordasio selbst,
   man kann sie aber anpassen. Nichts wird gespeichert, bevor die Vorschau bestätigt ist.
   Aufruf aus app.js: FremdImport.oeffnen(ctx) – ctx liefert Kontenplan, Speichern usw. */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var chf = function (r) { return (r / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  var ANBIETER = [
    { id: 'bexio', name: 'bexio',
      saldo: 'In bexio unter Buchhaltung die Bilanz oder Saldenliste per Wechseldatum (z. B. 31.12.) öffnen und als Excel oder CSV herunterladen.',
      journal: 'In bexio unter Buchhaltung das Journal öffnen, den Zeitraum filtern (z. B. 1.1. bis heute) und als Excel exportieren.' },
    { id: 'banana', name: 'Banana',
      saldo: 'In Banana die Tabelle «Konten» öffnen. Entweder die ganze Tabelle markieren und kopieren (Ctrl+A, Ctrl+C) und unten einfügen, oder über das Menü als Excel exportieren.',
      journal: 'In Banana die Tabelle «Buchungen» öffnen, alles markieren und kopieren (Ctrl+A, Ctrl+C) und unten einfügen, oder als Excel exportieren.' },
    { id: 'abacus', name: 'Abacus / AbaNinja',
      saldo: 'Unter Berichte die Saldoliste oder Bilanz per Stichtag öffnen und als Excel oder CSV exportieren.',
      journal: 'Unter Buchhaltung das Journal für den Zeitraum öffnen und als Excel oder CSV exportieren.' },
    { id: 'rma', name: 'Run my Accounts',
      saldo: 'Die Saldenliste per Stichtag als Excel oder CSV exportieren (Berichte).',
      journal: 'Das Journal für den Zeitraum als Excel oder CSV exportieren.' },
    { id: 'klara', name: 'Klara',
      saldo: 'In der Buchhaltung die Bilanz bzw. Saldenliste per Stichtag als Excel herunterladen.',
      journal: 'Das Buchungsjournal für den Zeitraum als Excel herunterladen.' },
    { id: 'sage', name: 'Sage 50 / Sage Start',
      saldo: 'Unter Auswertungen die Saldoliste per Stichtag öffnen und als Excel oder CSV speichern.',
      journal: 'Unter Auswertungen das Journal für den Zeitraum öffnen und als Excel oder CSV speichern.' },
    { id: 'excel', name: 'Excel / andere',
      saldo: 'Eine Tabelle mit den Spalten Konto, Bezeichnung und Saldo. Die Kontonummern nach Schweizer KMU-Kontenrahmen (z. B. 1020 Bank).',
      journal: 'Eine Tabelle mit den Spalten Datum, Beleg, Text, Soll, Haben und Betrag.' },
  ];

  // Spalten erkennen
  var MUSTER = {
    datum: /^(datum|date|buchungsdatum|belegdatum|valuta)/i,
    beleg: /^(beleg|beleg-?nr\.?|belegnummer|doc|dokument|referenz|ref\.?|buchungs-?nr\.?)$/i,
    text: /(beschreibung|buchungstext|^text|description|bezeichnung|bemerkung)/i,
    soll: /^(soll|konto ?soll|kt\.? ?soll|ktsoll|soll-?konto|debit|account ?debit|sollkonto)/i,
    haben: /^(haben|konto ?haben|kt\.? ?haben|kthaben|haben-?konto|credit|account ?credit|habenkonto)/i,
    betrag: /^(betrag|amount|betrag ?chf|chf|wert|betrag \(chf\))/i,
    konto: /^(konto|kto\.?|konto-?nr\.?|kontonummer|account|nr\.?|nummer)$/i,
    name: /(bezeichnung|beschreibung|name|kontoname|description|kontobezeichnung)/i,
    saldo: /(saldo|balance|schlusssaldo|endsaldo)/i,
    sollSumme: /^(soll|total soll|umsatz soll|debit)/i,
    habenSumme: /^(haben|total haben|umsatz haben|credit)/i,
  };
  function kopfFinden(zeilen, felder) {
    var best = -1, punkte = 0;
    for (var i = 0; i < Math.min(zeilen.length, 20); i++) {
      var p = 0;
      zeilen[i].forEach(function (z) { felder.forEach(function (f) { if (MUSTER[f].test(String(z).trim())) p++; }); });
      if (p > punkte) { punkte = p; best = i; }
    }
    return punkte >= 2 ? best : -1;
  }
  function spaltenRaten(kopf, art) {
    var s = {}, frei = function (i) { return Object.keys(s).every(function (k) { return s[k] !== i; }); };
    var reihen = art === 'journal' ? ['datum', 'soll', 'haben', 'betrag', 'beleg', 'text'] : ['konto', 'saldo', 'name', 'sollSumme', 'habenSumme'];
    reihen.forEach(function (f) {
      for (var i = 0; i < kopf.length; i++) if (frei(i) && MUSTER[f].test(String(kopf[i]).trim())) { s[f] = i; break; }
    });
    return s;
  }
  var kontoNr = function (z) { var m = String(z == null ? '' : z).trim().match(/^(\d{4})(?!\d)/); return m ? m[1] : ''; };

  /* ---------- Saldenliste → Eröffnungsbilanz ---------- */
  function saldoAuswerten(zeilen, start, sp, ctx) {
    var liste = [], uebersprungen = [];
    for (var i = start; i < zeilen.length; i++) {
      var z = zeilen[i], roh = z[sp.konto];
      var nr = kontoNr(roh);
      if (!nr) { if (String(roh || '').trim() && /\d/.test(roh)) uebersprungen.push(String(roh).trim()); continue; }
      if (!/^[12]/.test(nr)) continue; // nur Bilanzkonten
      var saldo = NaN;
      if (sp.saldo != null) saldo = Auszug.geld(z[sp.saldo]);
      else if (sp.sollSumme != null && sp.habenSumme != null) saldo = (Auszug.geld(z[sp.sollSumme]) || 0) - (Auszug.geld(z[sp.habenSumme]) || 0);
      if (!Number.isFinite(saldo) || !saldo) continue;
      liste.push({ nr: nr, name: sp.name != null ? String(z[sp.name] || '').trim().slice(0, 80) : '', saldo: saldo });
    }
    // Vorzeichen: Banana & Co. zeigen Passiven negativ (Soll positiv), andere alles positiv
    var passivNeg = liste.filter(function (k) { return k.nr[0] === '2' && k.saldo < 0; }).length, passivPos = liste.filter(function (k) { return k.nr[0] === '2' && k.saldo > 0; }).length;
    var sollPositiv = passivNeg > passivPos || (sp.saldo == null);
    var werte = {}, aktiv = 0, passiv = 0;
    liste.forEach(function (k) {
      var art = ctx.artNachNummer(k.nr), v = k.saldo;
      if (sollPositiv && art === 'passiv') v = -v;
      werte[k.nr] = (werte[k.nr] || 0) + v;
    });
    Object.keys(werte).forEach(function (nr) { if (ctx.artNachNummer(nr) === 'aktiv') aktiv += werte[nr]; else passiv += werte[nr]; });
    return { liste: liste, werte: werte, aktiv: aktiv, passiv: passiv, uebersprungen: uebersprungen };
  }

  /* ---------- Journal ---------- */
  function hash(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function journalAuswerten(zeilen, start, sp, ctx) {
    var gruppen = new Map(), fehler = [], namenlos = 0;
    for (var i = start; i < zeilen.length; i++) {
      var z = zeilen[i];
      var datum = Auszug.tagLesen(z[sp.datum]);
      var betrag = Auszug.geld(z[sp.betrag]);
      var soll = kontoNr(z[sp.soll]), haben = kontoNr(z[sp.haben]);
      if (!datum || !Number.isFinite(betrag) || !betrag || (!soll && !haben)) { if (z.some(function (c) { return String(c).trim(); }) && datum) namenlos++; continue; }
      if (betrag < 0) { var t = soll; soll = haben; haben = t; betrag = -betrag; }
      var beleg = sp.beleg != null ? String(z[sp.beleg] || '').trim().slice(0, 30) : '';
      var text = sp.text != null ? String(z[sp.text] || '').trim().slice(0, 200) : '';
      var schluessel = datum + '|' + (beleg || 'z' + i);
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, { datum: datum, beleg: beleg, text: text, soll: [], haben: [], zeile: i + 1 });
      var g = gruppen.get(schluessel);
      if (!g.text && text) g.text = text;
      if (soll) g.soll.push({ nr: soll, b: betrag });
      if (haben) g.haben.push({ nr: haben, b: betrag });
    }
    var eintraege = [];
    gruppen.forEach(function (g) {
      // Sammelbuchungen (eine Seite leer) zu Paaren Soll/Haben aufteilen
      var s = g.soll.map(function (x) { return { nr: x.nr, b: x.b }; }), h = g.haben.map(function (x) { return { nr: x.nr, b: x.b }; });
      var sS = s.reduce(function (a, x) { return a + x.b; }, 0), sH = h.reduce(function (a, x) { return a + x.b; }, 0);
      if (sS !== sH) { fehler.push('Zeile ' + g.zeile + ' (' + g.datum + (g.beleg ? ', Beleg ' + g.beleg : '') + '): Soll ' + chf(sS) + ' und Haben ' + chf(sH) + ' gehen nicht auf'); return; }
      var zeilenJ = [], a = 0, b = 0;
      while (a < s.length && b < h.length) {
        var m = Math.min(s[a].b, h[b].b);
        if (s[a].nr !== h[b].nr) zeilenJ.push({ soll: s[a].nr, haben: h[b].nr, betrag: m });
        s[a].b -= m; h[b].b -= m;
        if (!s[a].b) a++; if (!h[b].b) b++;
      }
      if (!zeilenJ.length) return;
      eintraege.push({ datum: g.datum, beleg: g.beleg, text: g.text || 'Übernommen', zeilen: zeilenJ });
    });
    var konten = new Set();
    eintraege.forEach(function (e) { e.zeilen.forEach(function (z) { konten.add(z.soll); konten.add(z.haben); }); });
    var plan = new Set(ctx.plan.map(function (k) { return k.nr; }));
    return { eintraege: eintraege.sort(function (x, y) { return x.datum.localeCompare(y.datum); }), fehler: fehler, neueKonten: Array.from(konten).filter(function (k) { return !plan.has(k); }).sort(), ohne: namenlos };
  }

  /* ---------- Dialog ---------- */
  function oeffnen(ctx, vorgabe) {
    vorgabe = vorgabe || {};
    var Z = { anbieter: vorgabe.anbieter || 'bexio', art: vorgabe.art || 'saldo', zeilen: null, start: 0, sp: {}, dateiName: '' };
    var d = document.createElement('dialog');
    d.className = 'fi-dlg';
    d.style.cssText = 'width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 30px);border:0;border-radius:20px;padding:0';
    document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); });
    var stil = '<style>.fi-in{padding:22px;display:grid;gap:14px}.fi-chips{display:flex;flex-wrap:wrap;gap:6px}.fi-chips button{border:1px solid var(--hairline-strong,#d5dfda);background:var(--karte,#fff);border-radius:100px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}' +
      '.fi-chips button.an{background:var(--blau,#0B3B2E);color:#fff;border-color:var(--blau,#0B3B2E)}.fi-box{background:var(--flaeche,#EEF5F1);border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.5}' +
      '.fi-box ol{margin:6px 0 0 18px;padding:0}.fi-tab{width:100%;border-collapse:collapse;font-size:13px}.fi-tab td,.fi-tab th{border-bottom:1px solid var(--hairline,#e3e9e6);padding:5px 6px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}' +
      '.fi-tab .r{text-align:right;font-variant-numeric:tabular-nums}.fi-sp{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.fi-sp label{display:grid;gap:3px;font-size:12.5px;color:var(--leise,#5b6b64)}' +
      '.fi-sp select{padding:7px 8px;border-radius:9px;border:1px solid var(--hairline-strong,#d5dfda);font:inherit;font-size:13.5px}.fi-ok{color:var(--elektrik,#0E7A55);font-weight:600}.fi-warn{color:#B7791F;font-weight:600}.fi-fehler{color:#B42318}' +
      '.fi-fuss{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}textarea.fi-einf{width:100%;min-height:90px;border-radius:12px;border:1px solid var(--hairline-strong,#d5dfda);padding:10px;font:13px/1.4 ui-monospace,monospace;box-sizing:border-box}</style>';

    function anbieter() { return ANBIETER.filter(function (a) { return a.id === Z.anbieter; })[0]; }
    function schritt1() {
      var a = anbieter();
      d.innerHTML = stil + '<div class="fi-in"><h3 style="margin:0">Aus einem anderen Programm übernehmen</h3>' +
        '<div><b style="font-size:13px">Bisheriges Programm</b><div class="fi-chips" style="margin-top:6px">' + ANBIETER.map(function (x) { return '<button type="button" data-fi-anbieter="' + x.id + '" class="' + (x.id === Z.anbieter ? 'an' : '') + '">' + esc(x.name) + '</button>'; }).join('') + '</div></div>' +
        '<div><b style="font-size:13px">Was übernehmen?</b><div class="fi-chips" style="margin-top:6px"><button type="button" data-fi-art="saldo" class="' + (Z.art === 'saldo' ? 'an' : '') + '">Kontostände (Eröffnungsbilanz)</button><button type="button" data-fi-art="journal" class="' + (Z.art === 'journal' ? 'an' : '') + '">Alle Buchungen (Journal)</button></div></div>' +
        '<div class="fi-box"><b>So geht es mit ' + esc(a.name) + '</b><ol>' +
          (Z.art === 'saldo'
            ? '<li>' + esc(a.saldo) + '</li><li>Stichtag ist der letzte Tag vor dem Wechsel, zum Beispiel der 31.12. Die Eröffnungsbilanz in Ordasio ist dann der 1.1.</li><li>Datei hier wählen oder die Tabelle einfügen. Ordasio übernimmt die Bilanzkonten (1000 bis 2999) und zeigt vorher alles an.</li>'
            : '<li>' + esc(a.journal) + '</li><li>Am besten zuerst die Eröffnungsbilanz übernehmen und dann die Buchungen ab dem 1.1. des laufenden Jahres.</li><li>Doppelte Buchungen erkennt Ordasio und überspringt sie. MWST-Abrechnungen bis zum Wechsel im alten Programm abschliessen.</li>') +
        '</ol></div>' +
        '<div style="display:grid;gap:8px"><button type="button" class="btn btn-haupt" data-fi-datei>Datei wählen (Excel, CSV, TXT)</button>' +
        '<details><summary style="cursor:pointer;font-size:14px">Oder Tabelle hineinkopieren</summary><textarea class="fi-einf" data-fi-einf placeholder="Tabelle aus Banana oder Excel markieren, kopieren und hier einfügen (Ctrl+V)"></textarea><button type="button" class="btn btn-klein" data-fi-lesen style="margin-top:6px">Eingefügte Tabelle lesen</button></details></div>' +
        '<p class="hinweis" style="margin:0">Kunden, Lieferanten und Artikel übernehmen Sie in den Rechnungen: <a href="rechnungen/?import=kunden">Kunden importieren</a> · <a href="rechnungen/?aktion=artikel">Artikel importieren</a>. Lieber machen lassen? Wir übernehmen alles für einmalig CHF 190: <a href="mailto:support@ordasio.ch?subject=Wechsel%20zu%20Ordasio">support@ordasio.ch</a></p>' +
        '<div class="fi-fuss"><button type="button" class="btn" data-fi-zu>Schliessen</button></div></div>';
    }
    function spaltenWahl(felder, namen) {
      var kopf = Z.zeilen[Z.start - 1] || [];
      var opt = function (f) { return '<option value="">nicht vorhanden</option>' + kopf.map(function (k, i) { return '<option value="' + i + '"' + (Z.sp[f] === i ? ' selected' : '') + '>' + esc(String(k || 'Spalte ' + (i + 1)).slice(0, 30)) + '</option>'; }).join(''); };
      return '<div class="fi-sp">' + felder.map(function (f, i) { return '<label>' + namen[i] + '<select data-fi-sp="' + f + '">' + opt(f) + '</select></label>'; }).join('') + '</div>';
    }
    function schritt2() {
      var html = '', ok = false;
      if (Z.art === 'saldo') {
        var r = Z.sp.konto != null && (Z.sp.saldo != null || (Z.sp.sollSumme != null && Z.sp.habenSumme != null)) ? saldoAuswerten(Z.zeilen, Z.start, Z.sp, ctx) : null;
        Z.ergebnis = r;
        var diff = r ? r.aktiv - r.passiv : 0;
        html = spaltenWahl(['konto', 'name', 'saldo', 'sollSumme', 'habenSumme'], ['Kontonummer', 'Bezeichnung', 'Saldo', 'Soll (falls kein Saldo)', 'Haben (falls kein Saldo)']) +
          (r && r.liste.length
            ? '<div style="max-height:34vh;overflow:auto"><table class="fi-tab"><tr><th>Konto</th><th>Bezeichnung</th><th class="r">Betrag</th></tr>' +
              Object.keys(r.werte).sort().map(function (nr) { var p = ctx.plan.filter(function (k) { return k.nr === nr; })[0], n = r.liste.filter(function (k) { return k.nr === nr; })[0]; return '<tr><td>' + nr + '</td><td>' + esc((p && p.name) || (n && n.name) || '') + (p ? '' : ' <span class="fi-warn">neu</span>') + '</td><td class="r">' + chf(r.werte[nr]) + '</td></tr>'; }).join('') + '</table></div>' +
              '<div class="fi-box">Aktiven <b>' + chf(r.aktiv) + '</b> · Passiven <b>' + chf(r.passiv) + '</b> · ' + (diff === 0 ? '<span class="fi-ok">ausgeglichen</span>' : '<span class="fi-warn">Differenz ' + chf(diff) + '</span><br>Meist ist das der Gewinn oder Verlust des Vorjahres, der im alten Programm noch nicht verbucht war. Ordasio bucht die Differenz auf ' + esc(ctx.ekKonto) + ' ' + esc(ctx.ekName) + '.') + '</div>'
            : '<p class="fi-fehler">Noch keine Kontostände erkannt. Bitte die Spalten oben prüfen.</p>');
        ok = !!(r && r.liste.length);
      } else {
        var j = Z.sp.datum != null && Z.sp.betrag != null && (Z.sp.soll != null || Z.sp.haben != null) ? journalAuswerten(Z.zeilen, Z.start, Z.sp, ctx) : null;
        Z.ergebnis = j;
        var vorhanden = new Set(ctx.journal.filter(function (x) { return !x.geloescht; }).map(function (x) { return x.id; }));
        var neu = j ? j.eintraege.filter(function (e) { return !vorhanden.has(ctx.idVon(e)); }) : [];
        var fest = neu.filter(function (e) { return ctx.istFest(e.datum); });
        html = spaltenWahl(['datum', 'beleg', 'text', 'soll', 'haben', 'betrag'], ['Datum', 'Beleg', 'Text', 'Konto Soll', 'Konto Haben', 'Betrag']) +
          (j && j.eintraege.length
            ? '<div style="max-height:30vh;overflow:auto"><table class="fi-tab"><tr><th>Datum</th><th>Beleg</th><th>Text</th><th>Soll</th><th>Haben</th><th class="r">Betrag</th></tr>' +
              j.eintraege.slice(0, 200).map(function (e) { return e.zeilen.map(function (z, k) { return '<tr><td>' + (k ? '' : esc(e.datum.split('-').reverse().join('.'))) + '</td><td>' + (k ? '' : esc(e.beleg)) + '</td><td>' + (k ? '' : esc(e.text)) + '</td><td>' + z.soll + '</td><td>' + z.haben + '</td><td class="r">' + chf(z.betrag) + '</td></tr>'; }).join(''); }).join('') + '</table></div>' +
              (j.eintraege.length > 200 ? '<p class="hinweis" style="margin:0">Vorschau zeigt die ersten 200 von ' + j.eintraege.length + ' Buchungen.</p>' : '') +
              '<div class="fi-box"><b>' + neu.length + '</b> Buchungen werden übernommen' + (j.eintraege.length - neu.length ? ', ' + (j.eintraege.length - neu.length) + ' sind schon da und werden übersprungen' : '') +
                (fest.length ? '<br><span class="fi-warn">' + fest.length + ' Buchungen liegen im festgeschriebenen Zeitraum und werden nicht übernommen.</span>' : '') +
                (j.neueKonten.length ? '<br><span class="fi-warn">Neue Konten werden angelegt: ' + esc(j.neueKonten.join(', ')) + '</span>' : '') +
                (j.fehler.length ? '<br><span class="fi-fehler">' + j.fehler.length + ' Buchungen gehen nicht auf und werden ausgelassen:</span><br><small>' + j.fehler.slice(0, 5).map(esc).join('<br>') + (j.fehler.length > 5 ? '<br>…' : '') + '</small>' : '') + '</div>'
            : '<p class="fi-fehler">Noch keine Buchungen erkannt. Bitte die Spalten oben prüfen.</p>');
        ok = neu.length - fest.length > 0;
      }
      d.innerHTML = stil + '<div class="fi-in"><h3 style="margin:0">' + (Z.art === 'saldo' ? 'Kontostände prüfen' : 'Buchungen prüfen') + '</h3><p class="hinweis" style="margin:0">' + esc(Z.dateiName) + ' · Spalten automatisch erkannt, bei Bedarf anpassen.</p>' + html +
        (!ctx.doppelt ? '<div class="fi-box"><b>Doppelte Buchhaltung nötig.</b> Kontostände und Journal gibt es mit Soll und Haben. Beim Übernehmen schaltet Ordasio sie für Sie ein. Ihre bisherigen Buchungen bleiben erhalten.</div>' : '') +
        (Z.art === 'saldo' && ctx.eroeffnung() ? '<div class="fi-box"><span class="fi-warn">Es gibt schon eine Eröffnungsbilanz.</span> Sie wird durch die neuen Kontostände ersetzt.</div>' : '') +
        '<div class="fi-fuss"><button type="button" class="btn" data-fi-zurueck>Zurück</button><button type="button" class="btn btn-haupt" data-fi-uebernehmen ' + (ok ? '' : 'disabled') + '>Übernehmen</button></div></div>';
    }
    function einlesen(zeilen, name) {
      zeilen = (zeilen || []).filter(function (z) { return z.some(function (c) { return String(c).trim(); }); });
      var felder = Z.art === 'journal' ? ['datum', 'soll', 'haben', 'betrag', 'beleg', 'text'] : ['konto', 'saldo', 'name'];
      var k = kopfFinden(zeilen, felder);
      if (k < 0) {
        // anderer Typ? (z. B. Journal statt Saldenliste gewählt)
        var andere = Z.art === 'journal' ? ['konto', 'saldo', 'name'] : ['datum', 'soll', 'haben', 'betrag'];
        if (kopfFinden(zeilen, andere) >= 0) { Z.art = Z.art === 'journal' ? 'saldo' : 'journal'; return einlesen(zeilen, name); }
        ctx.toast('Ich finde in dieser Tabelle keine Spaltenüberschriften (z. B. Konto und Saldo). Bitte mit Überschriften exportieren.'); return;
      }
      Z.zeilen = zeilen; Z.start = k + 1; Z.sp = spaltenRaten(zeilen[k], Z.art); Z.dateiName = name;
      schritt2();
    }
    async function uebernehmen() {
      var knopf = d.querySelector('[data-fi-uebernehmen]'); knopf.disabled = true; knopf.textContent = 'Wird übernommen …';
      try {
        if (!ctx.doppelt) await ctx.doppeltEinschalten();
        if (Z.art === 'saldo') {
          var r = Z.ergebnis, werte = Object.assign({}, r.werte), diff = r.aktiv - r.passiv;
          if (diff) werte[ctx.ekKonto] = (werte[ctx.ekKonto] || 0) + diff;
          await ctx.kontenErgaenzen(r.liste.map(function (k) { return { nr: k.nr, name: k.name }; }));
          await ctx.eroeffnungSpeichern(werte);
          d.close(); ctx.fertig('Eröffnungsbilanz übernommen (' + Object.keys(werte).length + ' Konten)');
        } else {
          var j = Z.ergebnis, vorhanden = new Set(ctx.journal.filter(function (x) { return !x.geloescht; }).map(function (x) { return x.id; }));
          var neu = j.eintraege.filter(function (e) { return !vorhanden.has(ctx.idVon(e)) && !ctx.istFest(e.datum); });
          await ctx.kontenErgaenzen(j.neueKonten.map(function (nr) { return { nr: nr, name: 'Konto ' + nr + ' (übernommen)' }; }));
          var am = new Date().toISOString(), quelle = anbieter().name;
          await ctx.journalSpeichern(neu.map(function (e) { return { id: ctx.idVon(e), art: 'manuell', datum: e.datum, beleg: e.beleg, text: e.text, zeilen: e.zeilen, importiert: { quelle: quelle, am: am }, geloescht: false }; }));
          d.close(); ctx.fertig(neu.length + ' Buchungen aus ' + quelle + ' übernommen');
        }
      } catch (x) { ctx.toast('Übernehmen hat nicht geklappt: ' + (x.message || x)); knopf.disabled = false; knopf.textContent = 'Übernehmen'; }
    }
    d.addEventListener('click', async function (e) {
      var t = e.target;
      if (t.closest('[data-fi-zu]')) { d.close(); return; }
      var an = t.closest('[data-fi-anbieter]'); if (an) { Z.anbieter = an.dataset.fiAnbieter; schritt1(); return; }
      var ar = t.closest('[data-fi-art]'); if (ar) { Z.art = ar.dataset.fiArt; schritt1(); return; }
      if (t.closest('[data-fi-zurueck]')) { schritt1(); return; }
      if (t.closest('[data-fi-datei]')) {
        var datei = await ctx.dateiWaehlen('.csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        if (!datei) return;
        try { einlesen(await Auszug.tabelle(datei), datei.name); } catch (x) { ctx.toast('Diese Datei kann ich nicht lesen: ' + (x.message || x)); }
        return;
      }
      if (t.closest('[data-fi-lesen]')) { var txt = d.querySelector('[data-fi-einf]').value; if (!txt.trim()) { ctx.toast('Bitte zuerst die Tabelle einfügen'); return; } einlesen(Auszug.zerlegen(txt), 'Eingefügte Tabelle'); return; }
      if (t.closest('[data-fi-uebernehmen]')) { uebernehmen(); return; }
    });
    d.addEventListener('change', function (e) {
      var s = e.target.closest('[data-fi-sp]'); if (!s) return;
      Z.sp[s.dataset.fiSp] = s.value === '' ? undefined : Number(s.value);
      if (s.value === '') delete Z.sp[s.dataset.fiSp];
      schritt2();
    });
    schritt1();
    d.showModal();
  }
  // Für Tests: ohne Dialog auswerten
  window.FremdImport = { oeffnen: oeffnen, ANBIETER: ANBIETER, _saldo: saldoAuswerten, _journal: journalAuswerten, _kopf: kopfFinden, _spalten: spaltenRaten, _id: function (e) { return 'fi-' + hash(e.datum + '|' + e.beleg + '|' + JSON.stringify(e.zeilen)); } };
})();
