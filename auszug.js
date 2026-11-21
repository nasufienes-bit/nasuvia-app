// Kontoauszüge aus jeder Datei vorbereiten: camt.053 (XML), CSV/TXT, Excel (XLSX/XLS) und PDF.
// XML und CSV gehen als Text an die Leser der jeweiligen Seite, Excel wird zu CSV,
// PDF wird hier direkt in Bewegungen umgewandelt (Datum, Betrag, Text; Vorzeichen über den Saldo).
(() => {
  const laden = (src) => new Promise((ok, f) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => f(new Error('Keine Verbindung zum Lesen dieser Datei.')); document.head.appendChild(s); });
  let pdfjs, xlsx;
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  const istPdf = (d, kopf) => d.type === 'application/pdf' || /\.pdf$/i.test(d.name) || kopf.startsWith('%PDF');
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

  /* ---------- PDF ---------- */
  async function pdfZeilen(datei) {
    if (!pdfjs) { await laden(PDFJS); pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; }
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) }).promise;
    const zeilen = [];
    for (let s = 1; s <= doc.numPages; s++) {
      const seite = await doc.getPage(s);
      const inhalt = await seite.getTextContent();
      const nachY = new Map();
      for (const it of inhalt.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = Math.round(it.transform[5] / 3) * 3;
        if (!nachY.has(y)) nachY.set(y, []);
        nachY.get(y).push({ x: it.transform[4], t: it.str });
      }
      [...nachY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, teile]) => zeilen.push(teile.sort((a, b) => a.x - b.x).map((x) => x.t).join(' ').replace(/\s+/g, ' ').trim()));
    }
    return zeilen;
  }
  const RE_DATUM = /\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/;
  const RE_BETRAG = /(?<![\d.])-?\d{1,3}(?:['’ ]\d{3})*[.,]\d{2}(?![\d])-?/g;
  const zahl = (s) => { const neg = s.trim().startsWith('-') || s.trim().endsWith('-'); const n = Math.round(Number(s.replace(/[-'’\s]/g, '').replace(',', '.')) * 100); return neg ? -n : n; };
  const datumIso = (m) => `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const PLUS = /gutschrift|eingang|zahlungseingang|lohn|salär|gehalt|rückerstattung|rueckerstattung|einzahlung|zins(?:gutschrift)?\b|twint von|überweisung von|credit/i;

  function pdfBewegungen(zeilen) {
    const aus = [];
    let saldo = null, letzte = null;
    for (const z of zeilen) {
      const d = z.match(RE_DATUM);
      const ohneDatum = z.replace(/\b\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})\b/g, ' ');
      const betraege = [...ohneDatum.matchAll(RE_BETRAG)].map((m) => m[0]);
      if (/saldo|kontostand|übertrag|uebertrag|vortrag/i.test(z) && betraege.length && (!d || /vortrag|anfang|alter/i.test(z))) {
        saldo = zahl(betraege[betraege.length - 1]); letzte = null; continue;
      }
      if (d && betraege.length) {
        const betrag = Math.abs(zahl(betraege[0]));
        if (!betrag) continue;
        const neuerSaldo = betraege.length >= 2 ? zahl(betraege[betraege.length - 1]) : null;
        let text = ohneDatum.replace(RE_BETRAG, '').replace(/\s+/g, ' ').trim();
        let vorz;
        if (saldo !== null && neuerSaldo !== null) {
          vorz = Math.abs(saldo + betrag - neuerSaldo) <= 1 ? 1 : Math.abs(saldo - betrag - neuerSaldo) <= 1 ? -1 : (PLUS.test(text) ? 1 : -1);
        } else vorz = PLUS.test(text) || betraege[0].trim().startsWith('+') ? 1 : -1;
        if (betraege[0].trim().startsWith('-') || betraege[0].trim().endsWith('-')) vorz = -1;
        if (neuerSaldo !== null) saldo = neuerSaldo;
        letzte = { datum: datumIso(d), betragRappen: vorz * betrag, partner: '', text };
        aus.push(letzte);
      } else if (letzte && !d && !betraege.length && z.length > 2 && z.length < 120 && !/seite|page|iban|konto|auszug|bank|datum|valuta/i.test(z)) {
        // Folgezeile: meist Empfänger oder Mitteilung
        if (!letzte.partner) letzte.partner = z.slice(0, 80);
        else if (letzte.text.length < 100) letzte.text = (letzte.text + ' ' + z).slice(0, 140);
      }
    }
    for (const b of aus) { if (!b.text && b.partner) b.text = b.partner; if (!b.partner) b.partner = b.text.split(/\s{2,}| \/ /)[0].slice(0, 80); }
    return aus.filter((b) => b.datum && b.betragRappen);
  }

  // Ergebnis: { roh } (Text für camt/CSV-Leser) oder { liste } (fertige Bewegungen aus PDF)
  async function vorbereiten(datei) {
    const bytes = new Uint8Array(await datei.slice(0, 8).arrayBuffer());
    const kopf = String.fromCharCode(...bytes);
    if (istPdf(datei, kopf)) {
      const liste = pdfBewegungen(await pdfZeilen(datei));
      if (!liste.length) throw new Error('In diesem PDF habe ich keine Buchungen gefunden. Am zuverlässigsten ist der Export als CSV oder camt.053 aus dem E-Banking.');
      return { liste, pdf: true };
    }
    if (istExcel(datei, bytes)) return { roh: await excelZuCsv(datei) };
    return { roh: await alsText(datei) };
  }

  window.Auszug = { vorbereiten, pdfBewegungen };
})();
