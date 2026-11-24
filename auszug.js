// Kontoauszüge aus jeder Datei vorbereiten: camt.053 (XML), CSV/TXT, Excel (XLSX/XLS), PDF und Fotos.
// XML und CSV gehen als Text an die Leser der jeweiligen Seite, Excel wird zu CSV.
// PDF: zuerst mit KI (falls eingerichtet), sonst im Browser nach Spalten gelesen (Belastung, Gutschrift, Saldo).
// Jede Lesung wird über den Saldo kontrolliert. Vor dem Übernehmen zeigt Auszug.pruefen() alles zum Kontrollieren.
(() => {
  const laden = (src) => new Promise((ok, f) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => f(new Error('Keine Verbindung zum Lesen dieser Datei.')); document.head.appendChild(s); });
  let pdfjs, xlsx;
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  const istPdf = (d, kopf) => d.type === 'application/pdf' || /\.pdf$/i.test(d.name) || kopf.startsWith('%PDF');
  const istBild = (d, bytes) => /^image\//.test(d.type) || /\.(jpe?g|png|heic|webp)$/i.test(d.name) || (bytes[0] === 0xff && bytes[1] === 0xd8) || (bytes[0] === 0x89 && bytes[1] === 0x50);
  const istExcel = (d, bytes) => /\.(xlsx|xls)$/i.test(d.name) || /spreadsheet|ms-excel/.test(d.type) || (bytes[0] === 0x50 && bytes[1] === 0x4b && !/\.zip$/i.test(d.name)) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);

  // Text sicher lesen: UTF-8, sonst Windows-1252 (ältere Bank-Exporte)
  async function alsText(datei) {
    const buf = await datei.arrayBuffer();
    let t = new TextDecoder('utf-8').decode(buf);
    if (t.includes('�')) { try { t = new TextDecoder('windows-1252').decode(buf); } catch {} }
    return t;
  }

  async function excelZuCsv(datei) {
    if (!xlsx) { await laden(XLSX); xlsx = window.XLSX; }
    const wb = xlsx.read(await datei.arrayBuffer(), { type: 'array', cellDates: true });
    // Blatt mit den meisten Zeilen nehmen
    const blatt = wb.SheetNames.map((n) => wb.Sheets[n]).sort((a, b) => (xlsx.utils.sheet_to_json(b, { header: 1 }).length - xlsx.utils.sheet_to_json(a, { header: 1 }).length))[0];
    return xlsx.utils.sheet_to_csv(blatt, { FS: ';', dateNF: 'dd.mm.yyyy' });
  }

  /* ---------- PDF: Zeilen mit Positionen ---------- */
  async function pdfSeiten(datei, melden) {
    if (!pdfjs) { await laden(PDFJS); pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; }
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) }).promise;
    const seiten = [];
    for (let s = 1; s <= doc.numPages; s++) {
      if (melden && doc.numPages > 1) melden(`Seite ${s} von ${doc.numPages} wird gelesen …`);
      const seite = await doc.getPage(s);
      const inhalt = await seite.getTextContent();
      // Wörter mit Position (x links, r rechts); Textstücke mit mehreren Wörtern werden anteilig aufgeteilt
      const woerter = [];
      for (const it of inhalt.items) {
        const str = it.str || ''; if (!str.trim()) continue;
        const x0 = it.transform[4], breite = it.width || str.length * 5, pro = breite / Math.max(1, str.length);
        let pos = 0;
        for (const teil of str.split(/(\s+)/)) {
          if (teil.trim()) woerter.push({ t: teil, x: x0 + pos * pro, r: x0 + (pos + teil.length) * pro, y: it.transform[5] });
          pos += teil.length;
        }
      }
      // Zu Zeilen gruppieren (gleiche Höhe, kleine Toleranz)
      woerter.sort((a, b) => b.y - a.y || a.x - b.x);
      const zeilen = [];
      for (const w of woerter) {
        const z = zeilen.find((l) => Math.abs(l.y - w.y) <= 2.5);
        if (z) z.w.push(w); else zeilen.push({ y: w.y, w: [w] });
      }
      zeilen.sort((a, b) => b.y - a.y);
      for (const z of zeilen) { z.w.sort((a, b) => a.x - b.x); z.text = z.w.map((w) => w.t).join(' '); }
      seiten.push(zeilen);
    }
    return seiten;
  }

  const RE_DATUM = /^(?:(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})|(\d{4})-(\d{2})-(\d{2}))$/;
  const RE_DATUM_IN = /\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/;
  const RE_BETRAG_WORT = /^[-+]?\d{1,3}(?:['’]\d{3})*[.,]\d{2}-?$|^[-+]?\d+[.,]\d{2}-?$/;
  const zahl = (s) => { s = String(s).trim(); const neg = s.startsWith('-') || s.endsWith('-'); const n = Math.round(Number(s.replace(/[-+'’\s]/g, '').replace(',', '.')) * 100); return neg ? -n : n; };
  const datumIso = (m) => (m[4] ? `${m[4]}-${m[5]}-${m[6]}` : `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  const PLUS = /gutschrift|eingang|zahlungseingang|lohn|salär|gehalt|rückerstattung|rueckerstattung|rückvergütung|einzahlung|zinsgutschrift|twint von|von twint|überweisung von|credit|salaire|remboursement|virement reçu|bonifico in entrata|accredito|versamento|stipendio/i;
  const MINUS = /einkauf|kartenzahlung|debitkarte|maestro|visa|mastercard|bezug|bancomat|lastschrift|dauerauftrag|e-banking|zahlung an|twint an|an twint|gebühr|spesen|preis für|belastung|prélèvement|achat|paiement à|acquisto|pagamento|prelevamento|addebito|ordre permanent|retrait/i;
  const KEINE_BUCHUNG = /^(total|summe|zwischentotal|umsätze|umsatztotal|saldo|kontostand|übertrag|uebertrag|neuer saldo|alter saldo|schlusssaldo|anfangssaldo)\b/i;
  const SPALTEN = [
    ['minus', /^(belastung(en)?|lastschrift(en)?|soll|debit|debits|ausgang|ausgänge|ausgaben|abgang|zahlungsausgang|belastet|débit|débits|addebit[oi]|withdrawals?|money out|paid out)$/i],
    ['plus', /^(gutschrift(en)?|haben|credit|credits|eingang|eingänge|einnahmen|zugang|zahlungseingang|gutgeschrieben|crédit|crédits|accredit[oi]|deposits?|money in|paid in)$/i],
    ['saldo', /^(saldo|kontostand|balance|stand|solde)$/i],
    ['betrag', /^(betrag|amount|chf|betrag\s?chf|importo|montant)$/i],
    // Datumsspalten: Zahlen darin (z. B. Valuta „05.11“) sind keine Beträge
    ['valuta', /^(valuta|valutadatum|val|wert|valuta-?datum|data valuta|date valeur|value date)$/i],
  ];
  const GELD = ['minus', 'plus', 'betrag'];

  // Spaltenköpfe suchen: eine Zeile mit mindestens zwei bekannten Spaltennamen
  function kopfSpalten(zeile) {
    const sp = [];
    // Einzelne Wörter und Paare („Money out“, „Data valuta“)
    const kand = [];
    zeile.w.forEach((w, i) => { const n = zeile.w[i + 1]; if (n && n.x - w.r < 14) kand.push({ t: w.t + ' ' + n.t, x: w.x, r: n.r }); kand.push(w); });
    for (const w of kand) { const a = SPALTEN.find(([, re]) => re.test(w.t.replace(/[:.]$/, ''))); if (a && !sp.some((s) => s.art === a[0] || (w.x < s.r && w.r > s.x))) sp.push({ art: a[0], x: w.x, r: w.r, wort: w.t }); }
    // „CHF“ neben „Belastung“ oder „Saldo“ ist nur eine Währungsangabe, keine eigene Spalte
    const echt = sp.some((s) => s.art === 'minus' || s.art === 'plus') ? sp.filter((s) => !(s.art === 'betrag' && /^chf$/i.test(s.wort))) : sp;
    return echt.length >= 2 && echt.some((s) => GELD.includes(s.art)) ? echt : null;
  }
  // Betrag einer Spalte zuordnen: Beträge stehen rechtsbündig, Köpfe meist auch
  function spalteVon(w, spalten) {
    let beste = null, abstand = Infinity;
    for (const s of spalten) {
      const d = w.r >= s.x - 25 && w.r <= s.r + 45 ? 0 : Math.min(Math.abs(w.r - s.r), Math.abs(w.r - s.x));
      if (d < abstand) { abstand = d; beste = s; }
    }
    return abstand < 90 ? beste : null;
  }

  function pdfBewegungen(seiten) {
    const aus = [];
    let spalten = null, saldo = null, anfang = null, ende = null, letzte = null, mitSpalten = 0;
    for (const zeilen of seiten) {
      for (const z of zeilen) {
        const k = kopfSpalten(z); if (k) { spalten = k; letzte = null; continue; }
        const datumW = z.w.find((w) => RE_DATUM.test(w.t));
        const betraege = z.w.filter((w) => RE_BETRAG_WORT.test(w.t));
        const textOhne = z.w.filter((w) => !RE_DATUM.test(w.t) && !RE_BETRAG_WORT.test(w.t)).map((w) => w.t).join(' ').replace(/\s+/g, ' ').trim();
        // Saldo-Zeilen: Anfangssaldo, Übertrag zwischen Seiten, Schlusssaldo
        const saldoZeile = betraege.length && /saldo|kontostand|übertrag|uebertrag|vortrag/i.test(textOhne) && (KEINE_BUCHUNG.test(textOhne) || textOhne.split(' ').length <= 4);
        if (saldoZeile) {
          const wert = zahl(betraege[betraege.length - 1].t);
          if (!aus.length) { anfang = wert; saldo = wert; }
          else if (/übertrag|uebertrag|vortrag/i.test(textOhne)) saldo = wert;
          else ende = wert;
          letzte = null; continue;
        }
        if (KEINE_BUCHUNG.test(textOhne)) { letzte = null; continue; }
        if (datumW && betraege.length && datumW.x < (z.w[0].x + 80)) {
          let betrag = null, neuerSaldo = null, sicher = false;
          if (spalten) {
            for (const w of betraege) {
              const s = spalteVon(w, spalten);
              if (!s || s.art === 'valuta') continue;
              if (s.art === 'saldo') neuerSaldo = zahl(w.t);
              else if (betrag === null) { const v = Math.abs(zahl(w.t)); betrag = s.art === 'minus' ? -v : s.art === 'plus' ? v : zahl(w.t); sicher = s.art !== 'betrag' || /^-|-$/.test(w.t); }
            }
            if (betrag !== null) mitSpalten++;
          }
          if (betrag === null) {
            // Ohne Spaltenköpfe: erster Betrag, letzter Betrag ist der Saldo
            const v = Math.abs(zahl(betraege[0].t));
            if (betraege.length >= 2) neuerSaldo = zahl(betraege[betraege.length - 1].t);
            betrag = /^-|-$/.test(betraege[0].t) ? -v : PLUS.test(textOhne) && !MINUS.test(textOhne) ? v : -v;
          }
          if (!betrag) continue;
          // Saldo-Kontrolle: passt das Vorzeichen zum neuen Saldo?
          let pruefung = null;
          if (saldo !== null && neuerSaldo !== null) {
            if (Math.abs(saldo + betrag - neuerSaldo) <= 1) pruefung = 'ok';
            else if (Math.abs(saldo - betrag - neuerSaldo) <= 1) { betrag = -betrag; pruefung = 'ok'; }
            else pruefung = 'abweichung';
          } else if (saldo === null && neuerSaldo !== null && anfang === null) { anfang = neuerSaldo - betrag; }
          if (neuerSaldo !== null) saldo = neuerSaldo;
          letzte = { datum: datumIso(datumW.t.match(RE_DATUM)), betragRappen: betrag, partner: '', text: textOhne, pruefung, unsicher: !sicher && pruefung !== 'ok', saldo: neuerSaldo, _x: betraege[0].r, _mitSp: !!spalten && sicher };
          aus.push(letzte);
        } else if (letzte && !datumW && !betraege.length && z.text.length > 2 && z.text.length < 120 && !/seite|page|iban|auszug|datum|valuta|bic|clearing/i.test(z.text)) {
          // Folgezeile: meist Empfänger oder Mitteilung
          if (!letzte.partner) letzte.partner = z.text.slice(0, 80);
          else if (letzte.text.length < 100) letzte.text = (letzte.text + ' ' + z.text).slice(0, 140);
        } else if (!datumW) letzte = letzte && betraege.length ? null : letzte;
      }
    }
    for (const b of aus) { if (!b.text && b.partner) b.text = b.partner; if (!b.partner) b.partner = b.text.split(/\s{2,}| \/ /)[0].slice(0, 80); }
    if (ende === null && saldo !== null && aus.some((b) => b.pruefung)) ende = saldo;
    // Saldo pro Zeile: Reihenfolge (auch neueste zuerst) und Vorzeichen daraus bestimmen
    const geht = (a, e) => a !== null && e !== null && Math.abs(a + aus.reduce((x, b) => x + b.betragRappen, 0) - e) <= 1;
    if (!geht(anfang, ende) && aus.filter((b) => b.saldo !== null).length >= 3) {
      const kopie = aus.map((b) => ({ ...b }));
      const a = saldoAusrichten(kopie);
      if (a && a.treffer >= a.paare * 0.6) {
        kopie.forEach((b, i) => Object.assign(aus[i], { betragRappen: b.betragRappen, pruefung: b.pruefung, unsicher: b.unsicher }));
        if (!geht(anfang, ende)) { anfang = a.anfang; ende = a.ende; }
      }
    }
    // Ohne Spaltenköpfe und ohne Saldo: Beträge stehen oft in zwei Spalten (Belastung / Gutschrift) – die Spalte entscheidet
    if (!mitSpalten) {
      const offen = aus.filter((b) => b.pruefung !== 'ok');
      const gruppen = [];
      for (const b of offen) { const g = gruppen.find((x) => Math.abs(x.x - b._x) < 12); if (g) { g.n.push(b); g.x = (g.x * (g.n.length - 1) + b._x) / g.n.length; } else gruppen.push({ x: b._x, n: [b] }); }
      const gross = gruppen.filter((g) => g.n.length >= Math.max(2, offen.length * 0.12)).sort((a, b) => a.x - b.x);
      if (gross.length === 2) {
        const stimme = (g) => g.n.reduce((s, b) => s + (PLUS.test(b.text) && !MINUS.test(b.text) ? 1 : 0) - (MINUS.test(b.text) && !PLUS.test(b.text) ? 1 : 0), 0);
        // Meist steht Belastung links von Gutschrift (UBS, ZKB, Raiffeisen); PostFinance umgekehrt – die Texte entscheiden
        const plusRechts = stimme(gross[1]) >= stimme(gross[0]);
        gross.forEach((g, i) => g.n.forEach((b) => { const v = Math.abs(b.betragRappen); b.betragRappen = (i === 1) === plusRechts ? v : -v; }));
      }
    }
    aus.forEach((b) => { delete b._x; delete b._mitSp; delete b.saldo; });
    return { liste: aus.filter((b) => b.datum && b.betragRappen), anfang, ende, spalten: mitSpalten > 0 };
  }

  /* ---------- KI (falls eingerichtet) ---------- */
  async function mitKi(datei) {
    if (!window.Leser || !Leser.ki) return null;
    const j = await Leser.ki(datei, 'kontoauszug').catch(() => null);
    if (!j) return null;
    if (j.fehler) return { fehler: j.fehler };
    const f = j.felder || {};
    if (f.lesbar === false || !Array.isArray(f.bewegungen)) return { fehler: 'Das ist kein lesbarer Kontoauszug.' };
    const liste = f.bewegungen.map((b) => ({
      datum: /^\d{4}-\d{2}-\d{2}$/.test(b.datum || '') ? b.datum : '',
      betragRappen: Math.round(Number(b.betrag) * 100),
      partner: String(b.gegenpartei || '').slice(0, 80), text: String(b.text || b.gegenpartei || '').slice(0, 140),
      saldo: Number.isFinite(Number(b.saldo)) && b.saldo !== null && b.saldo !== '' ? Math.round(Number(b.saldo) * 100) : null,
      unsicher: !!b.unsicher,
    })).filter((b) => b.datum && Number.isFinite(b.betragRappen) && b.betragRappen);
    const num = (x) => (x === null || x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Math.round(Number(x) * 100));
    return { liste, anfang: num(f.anfangssaldo), ende: num(f.endsaldo) };
  }

  // Stimmt Anfangssaldo + Bewegungen = Endsaldo?
  function kontrolle(e) {
    const ein = e.liste.filter((b) => b.betragRappen > 0).reduce((a, b) => a + b.betragRappen, 0);
    const aus = e.liste.filter((b) => b.betragRappen < 0).reduce((a, b) => a - b.betragRappen, 0);
    const stimmt = e.anfang != null && e.ende != null ? Math.abs(e.anfang + ein - aus - e.ende) <= 1 : null;
    return { ein, aus, stimmt, differenz: stimmt === false ? e.ende - (e.anfang + ein - aus) : 0 };
  }

  // Ergebnis: { roh } (Text für camt/CSV-Leser) oder { liste, anfang, ende, quelle } (fertige Bewegungen)
  // Im öffentlichen Demo-Konto keine echten Unterlagen hochladen: alle Besucher sehen dieselben Daten
  async function demoOk() {
    if (!window.NASUVIA_DEMO || !window.UI || !UI.frage) return true;
    return UI.frage('Sie sind im Demo-Konto. Alles, was Sie hier hochladen, sehen auch andere Besucher der Demo. Bitte nur Beispieldaten verwenden, für echte Daten ein eigenes Konto erstellen.\n\nTrotzdem fortfahren?');
  }
  async function vorbereiten(datei, melden) {
    if (!await demoOk()) throw new Error('Abgebrochen.');
    const bytes = new Uint8Array(await datei.slice(0, 8).arrayBuffer());
    const kopf = String.fromCharCode(...bytes);
    const pdf = istPdf(datei, kopf), bild = !pdf && istBild(datei, bytes);
    if (pdf || bild) {
      if (melden) melden(bild ? 'Foto wird gelesen …' : 'PDF wird gelesen …');
      let ki = null;
      try { ki = await mitKi(datei); } catch { ki = null; }
      let lokal = null;
      if (pdf) { try { lokal = pdfBewegungen(await pdfSeiten(datei, melden)); } catch (f) { if (!ki || ki.fehler) throw f; } }
      if (melden) melden('Beträge und Saldo werden kontrolliert …');
      const kiOk = ki && !ki.fehler && ki.liste.length;
      const lokalOk = lokal && lokal.liste.length;
      // Die Lesung nehmen, deren Saldo aufgeht; sonst die KI (liest Tabellen besser)
      let wahl = null;
      if (kiOk && kontrolle(ki).stimmt) wahl = { ...ki, quelle: 'ki' };
      else if (lokalOk && kontrolle(lokal).stimmt) wahl = { ...lokal, quelle: 'pdf' };
      else if (kiOk) wahl = { ...ki, quelle: 'ki' };
      else if (lokalOk) wahl = { ...lokal, quelle: 'pdf' };
      if (!wahl) {
        if (bild) throw new Error(ki && ki.fehler ? ki.fehler : 'Ein Foto vom Kontoauszug kann Ordasio nur mit dem automatischen Lesen auswerten. Bitte laden Sie den Auszug als PDF, CSV oder camt.053 aus dem E-Banking.');
        throw new Error('In diesem PDF habe ich keine Buchungen gefunden. Am zuverlässigsten ist der Export als CSV oder camt.053 aus dem E-Banking.');
      }
      return { ...wahl, pdf: true };
    }
    const roh = istExcel(datei, bytes) ? await excelZuCsv(datei) : await alsText(datei);
    if (melden) melden('Spalten und Saldo werden erkannt …');
    // Eigener Leser für camt.053 und die CSV-Formate der Schweizer Banken; sonst liest die Seite selbst
    try {
      const e = /<\?xml|<Document|BkToCstmr/i.test(roh.slice(0, 3000)) ? camtLesen(roh) : csvLesen(roh);
      if (e && e.liste.length) return { ...e, roh };
    } catch (f) { if (!/<\?xml|<Document/i.test(roh.slice(0, 3000))) throw f; }
    return { roh };
  }

  /* ---------- CSV und camt.053 der Schweizer Banken (ein Leser für alle Seiten) ---------- */
  // Unterstützt u. a. UBS (getrennt und mit Vorzeichen), PostFinance (neu, alt, Kreditkarte), Raiffeisen, ZKB,
  // Kantonalbanken (BEKB, BCV, BancaStato …), Cler, Migros Bank, Valiant, Yuh, Neon, Revolut, Swisscard,
  // Viseca, Cornèrcard, TWINT-Abrechnung und den eigenen Ordasio-Export. Deutsch, Französisch, Italienisch, Englisch.
  const zelle = (s) => String(s ?? '').replace(/^﻿/, '').trim();
  const klein = (s) => zelle(s).toLowerCase().replace(/\s+/g, ' ').replace(/[:*]$/, '').trim();

  // Beträge: 1'234.50 · 1 234,50 · 1.234,55 · -45.9 · 40,00- · (12.00) · CHF 12.00 · −12.00
  function geld(s) {
    let t = zelle(s).replace(/−/g, '-').replace(/\b(CHF|EUR|USD|GBP|Fr)\b\.?/gi, '').replace(/[\s '’`]/g, '');
    if (!t || t.startsWith('=') || /[a-z]/i.test(t)) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
    if (t.startsWith('-')) { neg = !neg; t = t.slice(1); } else if (t.startsWith('+')) t = t.slice(1);
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) || /^\d+,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    const r = Math.round(Number(t) * 100);
    return neg ? -r : r;
  }
  // Datum: 15.12.2023 · 01.01.26 · 31/12/2026 · 2026-07-02 00:00:00.0 · 2026.11.01
  function tagLesen(s) {
    s = zelle(s); let m;
    const iso = (j, mo, t) => { const M = +mo, T = +t; return M >= 1 && M <= 12 && T >= 1 && T <= 31 ? `${j}-${String(M).padStart(2, '0')}-${String(T).padStart(2, '0')}` : ''; };
    if ((m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?!\d)/))) return iso(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)/))) return iso(m[3].length === 2 ? '20' + m[3] : m[3], m[2], m[1]);
    return '';
  }

  // Text in Zeilen und Zellen zerlegen (Trennzeichen ; , oder Tab, Anführungszeichen, "" in Feldern)
  function zerlegen(roh) {
    const text = String(roh || '').replace(/^﻿/, '');
    const probe = text.split(/\r?\n/).slice(0, 60);
    const wertung = (tr) => probe.filter((z) => z.split(tr).length >= 3).length * 1000 + probe.reduce((a, z) => a + z.split(tr).length - 1, 0);
    const tr = [';', '\t', ','].sort((a, b) => wertung(b) - wertung(a))[0];
    const zeilen = []; let z = [], f = '', q = false, start = true;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
      if (c === '"' && start) { q = true; start = false; continue; }
      if (c === tr) { z.push(f.trim()); f = ''; start = true; continue; }
      if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; z.push(f.trim()); zeilen.push(z); z = []; f = ''; start = true; continue; }
      if (start && c !== ' ') start = false;
      f += c;
    }
    if (f || z.length) { z.push(f.trim()); zeilen.push(z); }
    return zeilen.filter((r) => r.some((x) => x !== ''));
  }

  // Spaltennamen → Bedeutung (Reihenfolge zählt)
  const ROLLEN = [
    ['weg', /^(betrag detail|individual amount|einzelbetrag|original amount|originalamount|amount in foreign currency|importo estero|original currency|originalwährung|exchange rate|cours|kurs|montant original|fremdbetrag|rabatt|quantity|price per unit|buy\/sell|asset|transaction no\.?|transaktions-nr\.?|n\. di transazione|referenznummer|zkb-referenz|rif\.esterno|transactionid|order uuid|twint order id|twint terminal id|iban|product|portfolio|banking relationship|valuation date|date from|date to|ccy\. ?rate|exchange rate)$/],
    ['ind', /^(debit\/credit|debit\/kredit|credit\/debit|debito\/credito|addebito\/accredito|soll\/haben|belastung\/gutschrift|gutschrift ?\/ ?belastung|débit\/crédit|crédit\/débit|einnahme\/ausgabe)$/],
    ['art', /^(art|typ)$/],
    ['betrag', /^(betrag|amount|importo|montant|credit\/debit amount|importo della transazione|montant de la transaction|betrag der transaktion|transaktionsbetrag|transaction amount|betrag transaktion( \(chf\))?|betrag( in)? chf|betrag \(chf\)|amount \(chf\)|amount in chf|montant en chf|importo in chf|chf)$/],
    ['plus', /^(gutschrift(en)?|gutschrift( in)? chf|gutschrift \(chf\)|haben|eingang|credit|credit in chf|credit amount|crédit|crédit en chf|crédits|accredit[oi]|accredito in chf|importo di accredito.*|money in|paid in|deposits?|einnahmen?)$/],
    ['minus', /^(belastung(en)?|belastung( in)? chf|belastung \(chf\)|lastschrift(en)?|lastschrift in chf|soll|ausgang|debit|debit in chf|debit amount|débit|débit en chf|débits|addebit[oi]|addebito in chf|importo di addebito.*|money out|paid out|withdrawals?|ausgaben?)$/],
    ['saldo', /^(saldo|saldo chf|saldo \(chf\)|saldo in chf|balance|solde|kontostand)$/],
    ['gebuehr', /^(fees\/commission|fee|fees|gebühr(en)?|transaktionskosten.*|transaction costs.*|frais.*|commissione|commissioni|costi di transazione.*)$/],
    ['buchung', /^(buchungsdatum|booking date|booked at|date d'écriture|date de comptabilisation|data di registrazione|data registrazione|data di contabilizzazione|date comptable|completed date)$/],
    ['datum', /^(datum|date|data|dat\.|trade date|transaktionsdatum|transaction date|data transazione|date de transaction|einkaufsdatum|purchase date|date d'achat|data dell'operazione|abschlussdatum|started date|date de l'opération)$/],
    ['valuta', /^(valuta|valutadatum|value date|valuta date|valutadate|data valuta|data di valuta|date de valeur|date valeur)$/],
    ['partner', /^(name auftraggeber.*|name des partners|recipient|sender|merchantname|merchant|commerciante|händler|empfänger|auftraggeber|begünstigter|gegenpartei|payee|counterparty|kunde|lieferant|partner)$/],
    ['text', /^(buchungstext|avisierungstext|notification text|texte de notification|testo di avviso|text|texte|testo|details|beschreibung ?\d?|description ?\d?|descrizione ?\d?|booking details|buchungsdetails|détails de comptabilisation|testo di contabilizzazione|zahlungszweck|mitteilung.*|activity name|subject|texte comptable|umsatztext|zusatzinfos buchung|zusatzinfos transaktion|dettaglio|libellé|transactions|name in the statement|transaktionen|opérations)$/],
    // Art der Buchung: nur als Ergänzung zum Text
    ['text2', /^(transazione|tipo di ordine|auftragsart|bewegungstyp|booking type|type de transaction|tipo di movimento|activity type|type|tipo|typ|secteur)$/],
    ['status', /^(status|stato|statetype|state|état)$/],
    ['waehrung', /^(währung|waehrung|whg|currency|ccy\.?|moneta|monnaie|debit currency|credit currency|div|devise)$/],
    ['kategorie', /^(kategorie|category|categoria|catégorie)$/],
    ['mwst', /^(mwst-satz|mwst satz|steuersatz|mwst|vat)$/],
    ['karte', /^(karte|card|carta|kartennummer|card number|numéro de carte|numero di carta|cardid|card id)$/],
  ];
  function rolleVon(kopf, werte) {
    const k = klein(kopf).replace(/^"|"$/g, '');
    if (!k) return null;
    const probe = werte.filter(Boolean).slice(0, 12);
    for (const [r, re] of ROLLEN) {
      if (!re.test(k)) continue;
      // „Valuta“ ist auf Italienisch die Währung; „Art/Typ“ nur, wenn Einnahme/Ausgabe drinsteht
      if (r === 'valuta' && probe.length && probe.filter((v) => /^[A-Z]{3}$/.test(v)).length > probe.length / 2) return 'waehrung';
      if (r === 'art') { if (probe.some((v) => /^(einnahme|ausgabe|ertrag|aufwand)$/i.test(v))) return 'ind'; return 'text2'; }
      return r;
    }
    // Unbekannte Namen: nach Wortteilen
    if (/\//.test(k) && /(debit|credit|belast|gutschr|soll|haben)/.test(k) && !/(amount|betrag|importo|montant)/.test(k)) return 'ind';
    if (/(gutschrift|credit|accredit|crédit|eingang)/.test(k)) return 'plus';
    if (/(belastung|lastschrift|debit|addebit|débit|ausgang)/.test(k)) return 'minus';
    if (/(saldo|balance|solde)/.test(k)) return 'saldo';
    if (/(betrag|amount|importo|montant)/.test(k)) return 'betrag';
    if (/(buchungsdatum|booking|registrazione|écriture)/.test(k)) return 'buchung';
    if (/(valuta|valeur|value)/.test(k)) return 'valuta';
    if (/(datum|date|data)/.test(k)) return 'datum';
    if (/(text|beschreib|descri|mitteil|libell|details)/.test(k)) return 'text';
    return null;
  }

  // Erkannte Bank (nur zur Anzeige, das Lesen funktioniert unabhängig davon)
  function bankVon(kopf) {
    const h = kopf.map(klein).join('|');
    const B = [
      ['PostFinance', /avisierungstext|notification text|texte de notification|testo di avviso|buchungsdetails|booking details|détails de comptabilisation|dettagli di registrazione/],
      ['UBS', /beschreibung1|description 1|descrizione1|individual amount|einzelbetrag|banking relationship|numéro de carte|addebito\/accredito/],
      ['Raiffeisen', /credit\/debit amount/], ['ZKB', /zkb-referenz/], ['Yuh', /activity type/], ['Neon', /\|wise\|spaces|\|spaces$/],
      ['Revolut', /started date/], ['Swisscard', /merchant category|registered category|debit\/kredit|debito\/credito/],
      ['Migros Bank', /cardid/], ['Viseca', /statetype/], ['TWINT', /twint/], ['BEKB', /name auftraggeber/],
      ['Bank Cler', /tipo di ordine|auftragsart/], ['BancaStato', /rif\.esterno/],
    ];
    const b = B.find(([, re]) => re.test(h));
    return b ? b[0] : '';
  }

  // Saldo-Spalte nutzen: Reihenfolge (alt→neu oder neu→alt) und Vorzeichen bestimmen, Anfangs- und Endsaldo berechnen
  function saldoAusrichten(rows) {
    const mit = rows.map((r, i) => (Number.isFinite(r.saldo) ? i : -1)).filter((i) => i >= 0);
    let vor = 0, rueck = 0, paare = 0;
    for (let k = 1; k < mit.length; k++) {
      const a = mit[k - 1], b = mit[k]; if (b !== a + 1) continue;
      paare++;
      const d = rows[b].saldo - rows[a].saldo;
      if (Math.abs(Math.abs(d) - Math.abs(rows[b].betragRappen)) <= 1) vor++;
      if (Math.abs(Math.abs(d) - Math.abs(rows[a].betragRappen)) <= 1) rueck++;
    }
    if (!paare || Math.max(vor, rueck) < paare * 0.6 || (paare === 1 && vor === rueck)) return null;
    const neuZuerst = rueck > vor;
    let treffer = 0;
    for (let k = 1; k < mit.length; k++) {
      const a = mit[k - 1], b = mit[k]; if (b !== a + 1) continue;
      const d = rows[b].saldo - rows[a].saldo;
      const ziel = neuZuerst ? rows[a] : rows[b], wert = neuZuerst ? -d : d;
      if (Math.abs(Math.abs(wert) - Math.abs(ziel.betragRappen)) <= 1) { ziel.betragRappen = wert; ziel.pruefung = 'ok'; ziel.unsicher = false; treffer++; }
      else ziel.pruefung = 'abweichung';
    }
    const summe = (von, bis) => rows.slice(von, bis).reduce((s, r) => s + r.betragRappen, 0);
    const erste = mit[0], letzte = mit[mit.length - 1];
    let anfang, ende;
    if (!neuZuerst) { anfang = rows[erste].saldo - summe(0, erste + 1); ende = rows[letzte].saldo + summe(letzte + 1, rows.length); }
    else { ende = rows[erste].saldo + summe(0, erste); anfang = rows[letzte].saldo - summe(letzte, rows.length); }
    return { anfang, ende, neuZuerst, treffer, paare };
  }

  function csvLesen(roh) {
    const zeilen = zerlegen(roh);
    // Kopfzeile: enthält Datum- und Betragsspalten, aber selbst keine Daten; bei mehreren die mit den meisten bekannten Spalten
    let ki = -1, rollen = null, beste = 0;
    for (let i = 0; i < Math.min(zeilen.length, 80); i++) {
      if (zeilen[i].some((k) => tagLesen(k) || Number.isFinite(geld(k)))) continue;
      const werte = (j) => zeilen.slice(i + 1, i + 14).map((z) => zelle(z[j]));
      const r = zeilen[i].map((k, j) => rolleVon(k, werte(j)));
      const hatDatum = r.some((x) => x === 'buchung' || x === 'datum' || x === 'valuta');
      const hatGeld = r.some((x) => x === 'betrag' || x === 'plus' || x === 'minus');
      const punkte = r.filter(Boolean).length;
      if (hatDatum && hatGeld && punkte > beste) { ki = i; rollen = r; beste = punkte; }
    }
    if (ki < 0) return ohneKopf(zeilen);
    const kopf = zeilen[ki];
    const alle = (r) => rollen.map((x, i) => (x === r ? i : -1)).filter((i) => i >= 0);
    const S = Object.fromEntries(['buchung', 'datum', 'valuta', 'betrag', 'plus', 'minus', 'saldo', 'text', 'text2', 'partner', 'status', 'gebuehr', 'waehrung', 'kategorie', 'mwst', 'karte', 'ind'].map((r) => [r, alle(r)]));
    // Spalten, die in jeder Zeile gleich sind (z. B. Kontoname), sagen nichts über die Buchung
    const datenZ = zeilen.slice(ki + 1).filter((z) => datumSpVorab(z));
    function datumSpVorab(z) { return rollen.some((x, i) => (x === 'buchung' || x === 'datum' || x === 'valuta') && tagLesen(z[i])); }
    const konstant = (i) => { const v = datenZ.map((z) => zelle(z[i])); return datenZ.length >= 2 && S.text.length + S.text2.length > 1 && v.every(Boolean) && new Set(v).size === 1; };
    S.text = S.text.filter((i) => !konstant(i)); S.text2 = S.text2.filter((i) => !konstant(i));
    const hk = kopf.map(klein);
    const karte = (S.karte.length > 0 || hk.some((k) => /^(merchantname|statetype|merchant category)$/.test(k))) && !S.saldo.length && !hk.includes('activity type');
    const kartenAbrechnung = karte || hk.some((k) => /^(rechnungsperiode|invoicing period|période de facturation|periodo di fatturazione|einkaufsdatum|purchase date|date d'achat)$/.test(k));
    const datumSp = [...S.buchung, ...S.datum, ...S.valuta];
    const bank = bankVon(kopf);
    const rows = [];
    let vorher = null, saldoVorAnfang = null;
    const nicht = /pend|ausstehend|in sospeso|en attente|declined|abgelehnt|revert|storn|failed|fehlgeschlagen|annul|cancel|refus|rifiutat|vorgemerkt|fallito|échou/i;
    for (const z of zeilen.slice(ki + 1)) {
      const w = (i) => zelle(z[i]);
      const datum = datumSp.map((i) => tagLesen(w(i))).find(Boolean) || '';
      let b = NaN;
      if (S.plus.length || S.minus.length) {
        const p = S.plus.map((i) => geld(w(i))).find((x) => Number.isFinite(x) && x);
        const m = S.minus.map((i) => geld(w(i))).find((x) => Number.isFinite(x) && x);
        if (p) b = Math.abs(p); else if (m) b = -Math.abs(m);
      }
      if (!Number.isFinite(b) && S.betrag.length) {
        b = S.betrag.map((i) => geld(w(i))).find((x) => Number.isFinite(x));
        if (Number.isFinite(b)) {
          const ind = S.ind.map((i) => klein(w(i))).find(Boolean) || '';
          if (/debit|soll|belast|addebit|débit|ausgabe|aufwand|lastschrift/.test(ind)) b = -Math.abs(b);
          else if (/credit|haben|gutschr|accredit|crédit|einnahme|ertrag/.test(ind)) b = Math.abs(b);
          else if (karte) b = -b; // Kartenabrechnungen: Einkauf positiv gedruckt, Rückerstattung negativ
        }
      }
      const texte = [...new Set([...S.text, ...S.text2].map(w).filter((t) => t && !Number.isFinite(geld(t)) && !tagLesen(t)))];
      const partner = S.partner.map(w).find(Boolean) || '';
      const saldo = S.saldo.map((i) => geld(w(i))).find((x) => Number.isFinite(x));
      // Folgezeile ohne Datum und Betrag: gehört zur Buchung davor (ZKB, Raiffeisen, Cornèr)
      if (!datum && !Number.isFinite(b)) {
        const erlaubt = new Set([...S.text, ...S.text2, ...S.partner, ...rollen.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0)]);
        const zus = z.map((t, i) => (erlaubt.has(i) && !datumSp.includes(i) ? zelle(t) : '')).filter((t) => t && !Number.isFinite(geld(t)) && !tagLesen(t) && !/^[A-Z]{3}$/.test(t)).join(' ');
        if (vorher && zus && !/^(disclaimer|hinweis|haftung|total|summe|remarque|avvertenza|the content|le contenu|il contenuto|der inhalt)/i.test(zus)) vorher.text = (vorher.text + ' · ' + zus).slice(0, 160);
        else if (zus) vorher = null;
        continue;
      }
      if (!datum) continue;
      // Saldozeile ohne Bewegung (z. B. „Saldovortrag“)
      if (!Number.isFinite(b) || !b) { if (Number.isFinite(saldo) && !rows.length) saldoVorAnfang = saldo; vorher = null; continue; }
      if (S.status.some((i) => nicht.test(w(i)))) { vorher = null; continue; }
      const whg = S.waehrung.map(w).find(Boolean) || '';
      const fremd = whg && !/^chf$/i.test(whg);
      const satz = S.mwst.length ? Number(String(w(S.mwst[0])).replace('%', '').replace(',', '.')) : NaN;
      const text = (texte.join(' · ') || partner).slice(0, 160) + (fremd ? ` (${whg})` : '');
      vorher = { datum, betragRappen: b, partner: (partner || texte[0] || '').slice(0, 80), text, saldo: Number.isFinite(saldo) ? saldo : null, unsicher: !!fremd,
        ...(S.kategorie.length && w(S.kategorie[0]) ? { kategorieName: w(S.kategorie[0]) } : {}), ...([0, 2.6, 3.8, 8.1].includes(satz) ? { mwstSatz: satz } : {}) };
      rows.push(vorher);
      const g = S.gebuehr.map((i) => geld(w(i))).find((x) => Number.isFinite(x) && x);
      if (g) rows.push({ datum, betragRappen: -Math.abs(g), partner: vorher.partner, text: ('Gebühr: ' + text).slice(0, 160), saldo: null });
    }
    const aus = saldoAusrichten(rows);
    let anfang = aus ? aus.anfang : null, ende = aus ? aus.ende : null;
    if (!aus && saldoVorAnfang !== null && rows.length && rows.every((r) => r.saldo === null)) anfang = null;
    return { liste: rows.map(({ saldo, ...r }) => r), anfang, ende, quelle: 'csv', bank, karte: kartenAbrechnung };
  }

  // Ohne Spaltenköpfe (z. B. alter PostFinance-Export): Datum vorne, Zahlen-Spalten, letzte Zahl = Saldo
  function ohneKopf(zeilen) {
    const daten = zeilen.filter((z) => tagLesen(z[0]));
    if (daten.length < 2) throw new Error('In dieser Datei habe ich keine Spalten für Datum und Betrag gefunden.');
    const breite = Math.max(...daten.map((z) => z.length));
    const zahlSp = [...Array(breite).keys()].filter((j) => j > 0 && daten.filter((z) => Number.isFinite(geld(z[j])) && !tagLesen(z[j])).length >= daten.length * 0.2);
    if (!zahlSp.length) throw new Error('In dieser Datei habe ich keine Beträge gefunden.');
    const saldoSp = zahlSp.length >= 2 ? zahlSp[zahlSp.length - 1] : -1;
    const geldSp = zahlSp.filter((j) => j !== saldoSp);
    const rows = [];
    for (const z of daten) {
      const werte = geldSp.map((j) => ({ j, v: geld(z[j]) })).filter((x) => Number.isFinite(x.v) && x.v);
      if (!werte.length) continue;
      // Zwei Geld-Spalten: erste = Gutschrift, zweite = Belastung (PostFinance alt); Saldo entscheidet am Ende
      const v = werte[0];
      const b = geldSp.length >= 2 ? (v.j === geldSp[0] ? Math.abs(v.v) : -Math.abs(v.v)) : v.v;
      const text = z.slice(1).filter((t, j) => t && !zahlSp.includes(j + 1) && !tagLesen(t)).join(' · ').slice(0, 160);
      rows.push({ datum: tagLesen(z[0]), betragRappen: b, partner: text.split(' · ')[0].slice(0, 80), text, saldo: saldoSp >= 0 && Number.isFinite(geld(z[saldoSp])) ? geld(z[saldoSp]) : null, unsicher: true });
    }
    const aus = saldoAusrichten(rows);
    return { liste: rows.map(({ saldo, ...r }) => r), anfang: aus ? aus.anfang : null, ende: aus ? aus.ende : null, quelle: 'csv', bank: '' };
  }

  function camtLesen(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const kinder = (el, n) => (el ? [...el.children].filter((c) => c.localName === n) : []);
    const tief = (el, ...pfad) => { let e = el; for (const n of pfad) e = e && e.getElementsByTagNameNS('*', n)[0]; return e || null; };
    const tx = (el, ...pfad) => { const e = tief(el, ...pfad); return e ? e.textContent.trim() : ''; };
    const auszuege = [...doc.getElementsByTagNameNS('*', 'Stmt'), ...doc.getElementsByTagNameNS('*', 'Rpt'), ...doc.getElementsByTagNameNS('*', 'Ntfctn')];
    const konten = new Set(auszuege.map((s) => tx(s, 'Acct', 'IBAN') || tx(s, 'Acct', 'Id')));
    const liste = []; let anfang = null, ende = null;
    auszuege.forEach((s, si) => {
      for (const bal of kinder(s, 'Bal')) {
        const cd = tx(bal, 'Tp', 'Cd'), amt = Math.round(Number(tx(bal, 'Amt')) * 100) * (tx(bal, 'CdtDbtInd') === 'DBIT' ? -1 : 1);
        if (!Number.isFinite(amt)) continue;
        if ((cd === 'OPBD' || (cd === 'PRCD' && anfang === null)) && si === 0) anfang = amt;
        if (cd === 'CLBD' && si === auszuege.length - 1) ende = amt;
      }
      for (const n of kinder(s, 'Ntry')) {
        const sts = tx(n, 'Sts', 'Cd') || tx(n, 'Sts'); if (sts && !/BOOK/i.test(sts)) continue;
        const amtEl = kinder(n, 'Amt')[0];
        const betrag = Math.round(Number(amtEl ? amtEl.textContent : NaN) * 100) * (kinder(n, 'CdtDbtInd')[0] && kinder(n, 'CdtDbtInd')[0].textContent.trim() === 'DBIT' ? -1 : 1);
        if (!Number.isFinite(betrag) || !betrag) continue;
        const details = n.getElementsByTagNameNS('*', 'TxDtls');
        const einzel = details.length === 1 ? details[0] : null;
        const partner = einzel ? (tx(einzel, 'RltdPties', betrag > 0 ? 'Dbtr' : 'Cdtr', 'Nm') || tx(einzel, 'RltdPties', 'Nm')) : '';
        const info = (einzel ? tx(einzel, 'RmtInf', 'Ustrd') || tx(einzel, 'AddtlTxInf') : '') || tx(n, 'AddtlNtryInf') || (details.length > 1 ? `Sammelbuchung (${details.length} Zahlungen)` : '');
        const whg = amtEl ? amtEl.getAttribute('Ccy') || '' : '';
        liste.push({ datum: tagLesen(tx(n, 'BookgDt', 'Dt') || tx(n, 'BookgDt', 'DtTm') || tx(n, 'ValDt', 'Dt')), betragRappen: betrag, partner: partner.slice(0, 80),
          text: ((info || partner) + (whg && whg !== 'CHF' ? ` (${whg})` : '')).slice(0, 160), ref: einzel ? tx(einzel, 'RmtInf', 'Ref') || tx(einzel, 'Refs', 'AcctSvcrRef') : '', unsicher: !!(whg && whg !== 'CHF') });
      }
    });
    return { liste: liste.filter((b) => b.datum), anfang: konten.size <= 1 ? anfang : null, ende: konten.size <= 1 ? ende : null, quelle: 'camt', bank: '' };
  }

  /* ---------- Prüfen vor dem Übernehmen ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chf = (r) => (r / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, "'");
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  let stilDa = false;
  function stil() {
    if (stilDa) return; stilDa = true;
    const s = document.createElement('style');
    s.textContent = `.az-dlg{border:0;border-radius:22px;padding:0;width:min(760px,calc(100vw - 16px));max-height:calc(100vh - 24px);box-shadow:0 30px 80px -30px rgba(0,0,0,.5);font-family:inherit;color:#0A1F17}
    .az-dlg::backdrop{background:rgba(10,20,16,.45)}
    .az-dlg form{display:flex;flex-direction:column;max-height:calc(100vh - 24px)}
    .az-kopf{padding:18px 20px 10px}.az-kopf h3{margin:0;font-size:1.2rem}.az-kopf p{margin:4px 0 0;color:#3F5A4F;font-size:.9rem}
    .az-kontrolle{margin:10px 20px 0;border-radius:14px;padding:12px 14px;font-size:.9rem;line-height:1.45}
    .az-kontrolle.ok{background:#E7F7EF;color:#0A5C3C}.az-kontrolle.warn{background:#FFF3E0;color:#7A4A00}.az-kontrolle.info{background:#EEF2F6;color:#334155}
    .az-kontrolle b{font-weight:700}
    .az-bestaetigen{display:flex;gap:10px;align-items:center;margin:10px 20px 0;padding:10px 14px;border-radius:14px;background:#fff;box-shadow:0 0 0 2px #F5B53D;font-size:.9rem;font-weight:600;cursor:pointer}
    .az-bestaetigen input{width:20px;height:20px;accent-color:var(--elektrik,#0E7A55);flex:none}
    .az-fuss .ja:disabled{opacity:.45;cursor:not-allowed}
    .az-summen{display:flex;gap:16px;flex-wrap:wrap;padding:10px 20px;font-size:.88rem;color:#3F5A4F}.az-summen b{color:#0A1F17}
    .az-werkzeug{display:flex;gap:8px;flex-wrap:wrap;padding:0 20px 8px}.az-werkzeug button{border:0;border-radius:100px;padding:6px 12px;background:#EEF2F0;font:inherit;font-size:.82rem;cursor:pointer;color:#0A1F17}
    .az-liste{overflow:auto;padding:0 12px;flex:1;min-height:120px}
    .az-zeile{display:grid;grid-template-columns:26px 98px 1fr 132px;gap:8px;align-items:center;padding:7px 8px;border-radius:12px}
    .az-zeile:nth-child(odd){background:#F6F8F7}.az-zeile.aus{opacity:.45}.az-zeile.unsicher{background:#FFF6E5}.az-zeile.abw{background:#FFECEC}
    .az-zeile input[type=checkbox]{width:18px;height:18px;accent-color:var(--elektrik,#0E7A55)}
    .az-zeile input[type=date]{border:1px solid #DCE3DF;border-radius:8px;padding:5px 4px;font:inherit;font-size:.82rem;width:100%;background:#fff}
    .az-text{min-width:0}.az-text b{display:block;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.az-text small{display:block;color:#7C8499;font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .az-betrag{display:flex;align-items:center;gap:4px}.az-betrag button{border:0;width:28px;height:30px;border-radius:8px;font:700 1rem inherit;cursor:pointer;flex:none}
    .az-betrag button.plus{background:#E7F7EF;color:#0A7150}.az-betrag button.minus{background:#FDECEC;color:#B4282D}
    .az-betrag input{width:100%;min-width:0;border:1px solid #DCE3DF;border-radius:8px;padding:5px 6px;font:inherit;font-size:.9rem;text-align:right;background:#fff}
    .az-fuss{display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 20px 16px;border-top:1px solid #EEF2F0;flex-wrap:wrap}
    .az-fuss small{margin-right:auto;color:#7C8499;font-size:.8rem;max-width:340px}
    .az-fuss button{border:0;border-radius:100px;padding:11px 18px;font:inherit;font-weight:600;cursor:pointer}
    .az-fuss .nein{background:#EEF2F0;color:#0A1F17}.az-fuss .ja{background:var(--elektrik,#0E7A55);color:#fff}
    @media(max-width:560px){.az-zeile{grid-template-columns:24px 1fr 118px;row-gap:2px}.az-zeile input[type=date]{grid-column:2;grid-row:2;width:130px}.az-text{grid-column:2;grid-row:1}.az-betrag{grid-column:3;grid-row:1/3}}`;
    document.head.appendChild(s);
  }

  // Zeigt alle gelesenen Bewegungen zum Kontrollieren. Gibt die bestätigte Liste zurück (oder null bei Abbruch).
  // optionen.doppelt(t) → true, wenn die Bewegung schon vorhanden ist
  function pruefen(e, optionen = {}) {
    stil();
    const zeilen = e.liste.map((b) => ({ ...b, an: !(optionen.doppelt && optionen.doppelt(b)), doppelt: !!(optionen.doppelt && optionen.doppelt(b)) }));
    return new Promise((fertig) => {
      const dlg = document.createElement('dialog'); dlg.className = 'az-dlg';
      const quelle = (e.bank ? `Erkannt: Export von ${e.bank}. ` : '') + ({ ki: 'Automatisch mit KI gelesen.', pdf: 'Aus dem PDF gelesen.', csv: 'Aus der Datei gelesen.', camt: 'Aus der camt-Datei gelesen.' }[e.quelle] || 'Aus der Datei gelesen.');
      let bestaetigt = false;
      // Zweifel: Saldo geht nicht auf, oder er lässt sich nicht kontrollieren und die Lesung ist unsicher
      const zweifel = () => {
        const k = kontrolle({ liste: zeilen, anfang: e.anfang, ende: e.ende });
        if (k.stimmt === true) return null;
        if (k.stimmt === false) return 'saldo';
        const n = zeilen.length, neg = zeilen.filter((z) => z.betragRappen < 0).length;
        if (n >= 12 && !e.karte && (neg / n > 0.95 || neg / n < 0.05)) return 'einseitig';
        if (e.quelle === 'pdf' || e.quelle === 'ki') return 'ungeprueft';
        return null;
      };
      const kopfHtml = () => {
        const gew = { liste: zeilen.filter((z) => z.an), anfang: e.anfang, ende: e.ende };
        const alle = { liste: zeilen, anfang: e.anfang, ende: e.ende };
        const k = kontrolle(alle), kg = kontrolle(gew), zw = zweifel();
        const n = zeilen.length, neg = zeilen.filter((z) => z.betragRappen < 0).length;
        let box;
        if (k.stimmt === true) box = `<div class="az-kontrolle ok">✓ <b>Saldo stimmt.</b> Anfangssaldo CHF ${chf(e.anfang)} + Eingänge ${chf(k.ein)} − Ausgänge ${chf(k.aus)} = Endsaldo CHF ${chf(e.ende)} wie auf dem Auszug.</div>`;
        else if (k.stimmt === false) box = `<div class="az-kontrolle warn">⚠ <b>Saldo geht nicht auf: Differenz CHF ${chf(k.differenz)}.</b> Anfangssaldo CHF ${chf(e.anfang)}, Endsaldo laut Auszug CHF ${chf(e.ende)}. Bitte die gelb oder rot markierten Zeilen mit dem Auszug vergleichen und Betrag oder Vorzeichen korrigieren.</div>`;
        else if (zw === 'einseitig') box = `<div class="az-kontrolle warn">⚠ <b>Fast alles ist als ${neg > n / 2 ? 'Ausgang' : 'Eingang'} erkannt (${neg > n / 2 ? neg : n - neg} von ${n}).</b> Das stimmt bei einem Kontoauszug selten. Bitte prüfen Sie Eingänge wie Lohn oder Gutschriften und wechseln Sie das Vorzeichen mit „−/+“. Sind alle verkehrt, hilft „Alle Vorzeichen umkehren“.</div>`;
        else if (zw === 'ungeprueft') box = `<div class="az-kontrolle warn">⚠ <b>Der Saldo lässt sich bei diesem PDF nicht automatisch kontrollieren.</b> Bitte vergleichen Sie Eingänge und Ausgänge unten mit Ihrem Auszug. Gelb markierte Zeilen sind unsicher.</div>`;
        else box = `<div class="az-kontrolle info">Bitte vergleichen Sie die Summen mit Ihrem Auszug, bevor Sie übernehmen. Unsichere Zeilen sind gelb markiert.</div>`;
        if (zw && e.quelle !== 'csv' && e.quelle !== 'camt') box += `<div class="az-kontrolle info" style="margin-top:8px">Am genausten ist der Export als <b>CSV</b> oder <b>camt.053</b> aus dem E-Banking: Dort stehen Beträge und Vorzeichen eindeutig drin, nichts muss erraten werden.</div>`;
        if (zw) box += `<label class="az-bestaetigen"><input type="checkbox" data-bestaetigt ${bestaetigt ? 'checked' : ''}> Ich habe Beträge und Vorzeichen mit dem Auszug verglichen.</label>`;
        return `${box}<div class="az-summen"><span>Ausgewählt: <b>${gew.liste.length}</b> von ${zeilen.length}</span><span>Eingänge: <b>CHF ${chf(kg.ein)}</b></span><span>Ausgänge: <b>CHF ${chf(kg.aus)}</b></span></div>`;
      };
      const zeileHtml = (z, i) => `<div class="az-zeile ${z.an ? '' : 'aus'} ${z.pruefung === 'abweichung' ? 'abw' : z.unsicher ? 'unsicher' : ''}" data-z="${i}">
        <input type="checkbox" data-an ${z.an ? 'checked' : ''} aria-label="Übernehmen">
        <input type="date" value="${esc(z.datum)}" data-datum>
        <div class="az-text"><b>${esc(z.partner || z.text || '—')}</b><small>${z.doppelt ? 'Schon vorhanden · ' : ''}${z.pruefung === 'abweichung' ? 'Passt nicht zum Saldo · ' : z.unsicher ? 'Bitte prüfen · ' : ''}${esc(z.text && z.text !== z.partner ? z.text : '')}</small></div>
        <div class="az-betrag"><button type="button" class="${z.betragRappen > 0 ? 'plus' : 'minus'}" data-vz title="Eingang oder Ausgang wechseln">${z.betragRappen > 0 ? '+' : '−'}</button><input inputmode="decimal" value="${chf(Math.abs(z.betragRappen))}" data-betrag aria-label="Betrag"></div></div>`;
      dlg.innerHTML = `<form method="dialog">
        <div class="az-kopf"><h3>Kontoauszug prüfen: ${zeilen.length} Bewegungen</h3><p>${quelle} Noch ist nichts gespeichert. Korrigieren Sie bei Bedarf Datum, Betrag oder Eingang/Ausgang.</p></div>
        <div data-kopf>${kopfHtml()}</div>
        <div class="az-werkzeug"><button type="button" data-alle="1">Alle wählen</button><button type="button" data-alle="0">Keine wählen</button><button type="button" data-umkehren>Alle Vorzeichen umkehren</button>${optionen.datei ? '<button type="button" data-original>📄 Original ansehen</button>' : ''}</div>
        <div class="az-liste">${zeilen.map(zeileHtml).join('')}</div>
        <div class="az-fuss"><small>Nach dem Übernehmen können Sie den ganzen Import jederzeit unter „Importe“ wieder entfernen, und gleich danach mit „Rückgängig“.</small><button type="button" class="nein" data-abbruch>Abbrechen</button><button class="ja" data-ok>Übernehmen</button></div></form>`;
      const knopf = () => { const n = zeilen.filter((z) => z.an).length, zw = zweifel(); const b = dlg.querySelector('[data-ok]');
        b.textContent = !n ? 'Nichts gewählt' : zw && !bestaetigt ? 'Erst vergleichen' : optionen.weiter ? `${optionen.weiter} (${n})` : `${n} übernehmen`;
        b.disabled = !n || (!!zw && !bestaetigt); };
      const kopfNeu = () => { dlg.querySelector('[data-kopf]').innerHTML = kopfHtml(); knopf(); };
      const zeileNeu = (i) => { const el = dlg.querySelector(`[data-z="${i}"]`); el.outerHTML = zeileHtml(zeilen[i], i); };
      dlg.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t.closest('[data-abbruch]')) { dlg.close(); return; }
        if (t.closest('[data-original]') && optionen.datei) { const u = URL.createObjectURL(optionen.datei); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 120000); return; }
        if (t.closest('[data-umkehren]')) { zeilen.forEach((z, i) => { z.betragRappen = -z.betragRappen; z.pruefung = null; zeileNeu(i); }); kopfNeu(); return; }
        const a = t.closest('[data-alle]'); if (a) { zeilen.forEach((z, i) => { z.an = a.dataset.alle === '1'; zeileNeu(i); }); kopfNeu(); return; }
        const vz = t.closest('[data-vz]'); if (vz) { const i = Number(vz.closest('[data-z]').dataset.z); zeilen[i].betragRappen = -zeilen[i].betragRappen; zeilen[i].pruefung = null; zeilen[i].unsicher = false; zeileNeu(i); kopfNeu(); }
      });
      dlg.addEventListener('change', (ev) => {
        if (ev.target.matches('[data-bestaetigt]')) { bestaetigt = ev.target.checked; knopf(); return; }
        const z = ev.target.closest('[data-z]'); if (!z) return; const i = Number(z.dataset.z);
        if (ev.target.matches('[data-an]')) { zeilen[i].an = ev.target.checked; z.classList.toggle('aus', !zeilen[i].an); kopfNeu(); }
        if (ev.target.matches('[data-datum]') && ev.target.value) zeilen[i].datum = ev.target.value;
        if (ev.target.matches('[data-betrag]')) {
          const v = Math.abs(zahl(ev.target.value.replace(/[^\d.,'’-]/g, '') || '0'));
          if (v) { zeilen[i].betragRappen = Math.sign(zeilen[i].betragRappen || -1) * v; zeilen[i].pruefung = null; zeilen[i].unsicher = false; }
          zeileNeu(i); kopfNeu();
        }
      });
      let ergebnis = null;
      dlg.addEventListener('submit', (ev) => { ev.preventDefault(); ergebnis = zeilen.filter((z) => z.an).map(({ an, doppelt, pruefung, unsicher, saldo, ...b }) => b); dlg.close(); });
      dlg.addEventListener('close', () => { dlg.remove(); fertig(ergebnis); });
      document.body.appendChild(dlg); knopf(); dlg.showModal();
    });
  }

  window.Auszug = { vorbereiten, pdfBewegungen, pdfSeiten, kontrolle, pruefen, csvLesen, camtLesen, geld, tagLesen };
})();
