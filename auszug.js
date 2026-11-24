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

  const RE_DATUM = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/;
  const RE_DATUM_IN = /\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/;
  const RE_BETRAG_WORT = /^[-+]?\d{1,3}(?:['’]\d{3})*[.,]\d{2}-?$|^[-+]?\d+[.,]\d{2}-?$/;
  const zahl = (s) => { s = String(s).trim(); const neg = s.startsWith('-') || s.endsWith('-'); const n = Math.round(Number(s.replace(/[-+'’\s]/g, '').replace(',', '.')) * 100); return neg ? -n : n; };
  const datumIso = (m) => `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const PLUS = /gutschrift|eingang|zahlungseingang|lohn|salär|gehalt|rückerstattung|rueckerstattung|einzahlung|zinsgutschrift|twint von|überweisung von|credit/i;
  const KEINE_BUCHUNG = /^(total|summe|zwischentotal|umsätze|umsatztotal|saldo|kontostand|übertrag|uebertrag|neuer saldo|alter saldo|schlusssaldo|anfangssaldo)\b/i;
  const SPALTEN = [
    ['minus', /^(belastung(en)?|lastschrift(en)?|soll|debit|ausgang|ausgänge|abgang|zahlungsausgang|belastet)$/i],
    ['plus', /^(gutschrift(en)?|haben|credit|eingang|eingänge|zugang|zahlungseingang|gutgeschrieben)$/i],
    ['saldo', /^(saldo|kontostand|balance|stand)$/i],
    ['betrag', /^(betrag|amount|chf|betrag\s?chf)$/i],
    // Datumsspalten: Zahlen darin (z. B. Valuta „05.11“) sind keine Beträge
    ['valuta', /^(valuta|valutadatum|val|wert|valuta-?datum)$/i],
  ];
  const GELD = ['minus', 'plus', 'betrag'];

  // Spaltenköpfe suchen: eine Zeile mit mindestens zwei bekannten Spaltennamen
  function kopfSpalten(zeile) {
    const sp = [];
    for (const w of zeile.w) { const a = SPALTEN.find(([, re]) => re.test(w.t.replace(/[:.]$/, ''))); if (a && !sp.some((s) => s.art === a[0])) sp.push({ art: a[0], x: w.x, r: w.r, wort: w.t }); }
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
            betrag = /^-|-$/.test(betraege[0].t) ? -v : PLUS.test(textOhne) ? v : -v;
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
          letzte = { datum: datumIso(datumW.t.match(RE_DATUM)), betragRappen: betrag, partner: '', text: textOhne, pruefung, unsicher: !sicher && pruefung !== 'ok' };
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
  async function vorbereiten(datei, melden) {
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
    if (istExcel(datei, bytes)) return { roh: await excelZuCsv(datei) };
    return { roh: await alsText(datei) };
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
      const quelle = { ki: 'Automatisch mit KI gelesen.', pdf: 'Aus dem PDF gelesen.', csv: 'Aus der Datei gelesen.', camt: 'Aus der camt-Datei gelesen.' }[e.quelle] || 'Aus der Datei gelesen.';
      let bestaetigt = false;
      // Zweifel: Saldo geht nicht auf, oder er lässt sich nicht kontrollieren und die Lesung ist unsicher
      const zweifel = () => {
        const k = kontrolle({ liste: zeilen, anfang: e.anfang, ende: e.ende });
        if (k.stimmt === true) return null;
        if (k.stimmt === false) return 'saldo';
        const n = zeilen.length, neg = zeilen.filter((z) => z.betragRappen < 0).length;
        if (n >= 12 && (neg / n > 0.95 || neg / n < 0.05)) return 'einseitig';
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

  window.Auszug = { vorbereiten, pdfBewegungen, pdfSeiten, kontrolle, pruefen };
})();
