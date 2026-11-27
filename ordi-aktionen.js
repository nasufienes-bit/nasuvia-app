/* Ordi als Assistent: versteht Aufträge, zeigt eine Vorschau und führt erst nach „Ja“ aus.
   Ohne KI-Schlüssel versteht Ordi die wichtigsten Sätze selbst (Rechnung, Erinnerung, Zahlen, Mahnen, Stelle, Liquidität).
   Mit KI (Edge-Funktion „ordi“) kommen Aufträge als { typ, ... } zurück und laufen über dieselbe Vorschau.
   window.OrdiAktionen = { erkennen(frage) → Promise<{ text?, html?, aktion? } | null>, karte(aktion), ausfuehren(aktion), kontext() } */
(function () {
  'use strict';
  if (window.OrdiAktionen) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const chf = (r) => 'CHF ' + fmt.format((r || 0) / 100);
  const zahl = (t) => Number(String(t || '').replace(/[’'\s]/g, '').replace(',', '.'));
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const plusTage = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  const WURZEL = (() => { const s = document.querySelector('script[src*="ordi-aktionen.js"]'); try { return new URL('.', s.src).href; } catch { return '/'; } })();

  // Daten auf dem Gerät lesen (Buchhaltung, Rechnungen)
  const idb = (name, store) => new Promise((ok) => {
    try {
      const r = indexedDB.open(name);
      r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains(store)) { db.close(); return ok([]); }
        const g = db.transaction(store).objectStore(store).getAll(); g.onsuccess = () => { db.close(); ok((g.result || []).filter((x) => !x.geloescht)); }; g.onerror = () => { db.close(); ok([]); }; };
      r.onerror = () => ok([]);
    } catch { ok([]); }
  });
  const netto = (b) => (b.betragRappen || 0) - (b.mwstRappen || 0);
  async function kontext() {
    const [b, r, e] = await Promise.all([idb('nasuvia-buchhaltung', 'buchungen'), idb('nasuvia-rechnungen', 'rechnung'), idb('nasuvia-buchhaltung', 'einstellungen')]);
    const h = heute(), j = h.slice(0, 4);
    const monate = {};
    for (const x of b) { const m = (x.datum || '').slice(0, 7); if (!m) continue; monate[m] = monate[m] || { ein: 0, aus: 0 }; if (x.typ === 'einnahme') monate[m].ein += netto(x); else monate[m].aus += netto(x); }
    const rechn = r.filter((x) => (x.dokArt || 'rechnung') === 'rechnung');
    const offen = rechn.filter((x) => !x.bezahlt), ueber = offen.filter((x) => x.faellig && x.faellig < h);
    const haupt = e.find((x) => x.id === 'haupt') || {};
    const kat = {}; for (const x of b) if (x.typ === 'ausgabe' && (x.datum || '').startsWith(j)) kat[x.kategorie] = (kat[x.kategorie] || 0) + netto(x);
    const kats = kategorien(haupt);
    const letzte = [...b].sort((x, y) => String(y.datum).localeCompare(String(x.datum))).slice(0, 70)
      .map((x) => [String(x.id).slice(0, 8), x.datum, x.typ === 'einnahme' ? 'E' : 'A', x.betragRappen, x.kategorie, (x.partner || '').slice(0, 30), (x.text || '').slice(0, 40), x.mwstSatz].join('|'));
    const D = window.Doppelt, rf = (lizenz() || {}).rechtsform || haupt.rechtsform || 'einzel';
    const doppelt = !!haupt.doppelt || /gmbh|ag|genossenschaft|verein|stiftung/.test(rf);
    return { heute: h, rechtsform: rf, doppelt, festgeschriebenBis: haupt.festBis || '', kmAnsatz: Number(haupt.kmAnsatz) || 0.7,
      kategorien: { ausgabe: kats.ausgabe.map((k) => `${k.id}=${k.name} (${k.satz}%)`), einnahme: kats.einnahme.map((k) => `${k.id}=${k.name} (${k.satz}%)`) },
      buchungen_neueste: 'ref|datum|E/A|rappen|kategorie|partner|text|mwst ; ' + letzte.join(' ; '),
      offeneRechnungen: offen.slice(0, 25).map((x) => `${x.nr}|${x.kunde || ''}|${x.betragRappen}|${x.faellig || ''}`),
      ...(doppelt && D && D.kontenplan ? { konten: D.kontenplan(rf, haupt.konten || []).map((k) => k.nr + ' ' + k.name).join('; ') } : {}),
      monate, offen: { anzahl: offen.length, summe: offen.reduce((s, x) => s + (x.betragRappen || 0), 0) }, ueberfaellig: { anzahl: ueber.length, summe: ueber.reduce((s, x) => s + (x.betragRappen || 0), 0), liste: ueber.slice(0, 8).map((x) => ({ nr: x.nr, kunde: x.kunde, betrag: x.betragRappen, faellig: x.faellig })) },
      kontostand: haupt.liquiStand || null, ausgabenKategorien: kat, kunden: [...new Set(rechn.map((x) => x.kunde).filter(Boolean))].slice(0, 60) };
  }

  // Zeitangaben: heute, morgen, übermorgen, in 3 Tagen, am 12.12., nächsten Montag
  function datumAus(t) {
    const n = t.toLowerCase(); let m;
    if (/übermorgen/.test(n)) return plusTage(heute(), 2);
    if (/morgen/.test(n)) return plusTage(heute(), 1);
    if (/heute/.test(n)) return heute();
    if ((m = n.match(/in (\d+) tag/))) return plusTage(heute(), Number(m[1]));
    if ((m = n.match(/in (\d+) woche/))) return plusTage(heute(), 7 * Number(m[1]));
    if ((m = n.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/))) { const jj = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : heute().slice(0, 4); let d = `${jj}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (!m[3] && d < heute()) d = `${Number(jj) + 1}${d.slice(4)}`; return d; }
    const TAGE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
    const i = TAGE.findIndex((x) => n.includes(x));
    if (i >= 0) { const d = new Date(); const diff = ((i - d.getDay() + 7) % 7) || 7; return plusTage(heute(), diff); }
    return '';
  }
  const zeitAus = (t) => { const m = t.match(/um (\d{1,2})(?:[:.](\d{2}))?\s*(uhr)?/i); return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : ''; };

  // Team-Aufträge, auch mehrere in einem Satz:
  // „Füge einen Mitarbeiter namens Luca Meier hinzu, erstelle den Auftrag Badsanierung Müller und teile ihm diesen Auftrag zu“
  const STOP = new Set(['füge', 'fuege', 'erfasse', 'lege', 'nimm', 'mach', 'erstelle', 'eröffne', 'teile', 'weise', 'gib', 'plane', 'einen', 'eine', 'ein', 'neuen', 'neue', 'neu', 'mitarbeiter', 'mitarbeiterin', 'mitarbeitende', 'namens', 'name', 'namen', 'heisst', 'hinzu', 'an', 'auf', 'ist', 'mit', 'dem', 'den', 'die', 'der', 'das', 'ihm', 'ihn', 'ihr', 'ihnen', 'sie', 'diesen', 'dieser', 'diese', 'auftrag', 'zu', 'bitte', 'noch', 'dazu', 'person', 'als']);
  const BRUCH = /^(mit|stundenlohn|lohn|ansatz|und|als|für|ab|per)$/i;
  const nameAus = (x) => {
    const w = x.replace(/[:,.!?]/g, ' ').split(/\s+/).filter(Boolean), out = [];
    let start = false;
    for (const t of w) {
      const k = t.toLowerCase();
      if (!start) { if (STOP.has(k)) continue; start = true; }
      if (BRUCH.test(k) || STOP.has(k) || /\d/.test(k)) { if (out.length) break; else continue; }
      out.push(t.charAt(0).toUpperCase() + t.slice(1)); if (out.length === 2) break;
    }
    return out.join(' ');
  };
  function teamPlan(t) {
    const teile = t.split(/\s*(?:,|;|\bund dann\b|\bdann\b|\bund\b(?=\s+(?:füge|erstelle|lege|teile|weise|plane|gib|mach|erfasse|schreib|stell)))\s*/i).filter(Boolean);
    const schritte = []; let ma = null, af = null, m;
    const geld = (x) => { const g = x && x.match(/(\d+(?:[.,]\d+)?)/); return g ? Math.round(zahl(g[1]) * 100) : 0; };
    for (const teil of teile) {
      const x = teil.trim();
      if (/\bmitarbeiter(in)?\b/i.test(x) && /(füge|fuege|erfasse|lege|nimm|neue[nr]?)\b/i.test(x) && !/\bauftrag\b/i.test(x)) {
        const name = nameAus(x); if (!name) continue;
        ma = name;
        const lohn = x.match(/(?:stundenlohn|lohn)\D{0,12}(\d+(?:[.,]\d+)?)/i), ans = x.match(/(?:ansatz|verrechnen|für kunden)\D{0,12}(\d+(?:[.,]\d+)?)/i);
        schritte.push({ typ: 'mitarbeiter', name, stundenlohn: lohn ? geld(lohn[1]) : 0, ansatz: ans ? geld(ans[1]) : 0 }); continue;
      }
      if ((m = x.match(/(?:erstelle|lege|mach|eröffne|füge)\b.*?\bauftrag\b\s*(?:namens|mit\s+(?:dem\s+)?namen|:)?\s*[„"«]?([^„"«»"]+?)[“"»]?(?:\s+(?:für|bei)\s+(?:den\s+|die\s+|kunde[n]?\s+)?(.+?))?(?:\s+(?:an|in)\s+(?:der\s+)?(.+?))?(?:\s+(?:an|hinzu|auf))?\s*$/i)) && !/^(an|hinzu|auf|zu|diesen|den)$/i.test(m[1].trim())) {
        af = m[1].trim(); schritte.push({ typ: 'auftrag', name: af, kunde: (m[2] || '').trim(), adresse: (m[3] || '').trim() }); continue;
      }
      if (/(teile|weise|gib)\b.*\bzu\b/i.test(x)) {
        const was = (x.match(/auftrag\s+[„"«]?([^„"«»"]+?)[“"»]?\s+(?:zu\b|an\b)/i) || [])[1];
        let auftrag = (was && !/^(diesen|den|dem|neuen)$/i.test(was) ? was : '') || af;
        let wer = nameAus(was ? x.replace(was, ' ') : x) || ma;
        // „Teile den Auftrag Heizung Schulhaus Sara zu“: letztes Wort ist die Person
        if (!wer && auftrag && auftrag.split(/\s+/).length >= 2) { const w = auftrag.split(/\s+/); wer = w.pop(); auftrag = w.join(' '); }
        if (auftrag && !af) af = auftrag;
        schritte.push({ typ: 'zuweisen', mitarbeiter: wer || '', auftrag: auftrag || '' }); continue;
      }
      if (/\b(rechnung|rächnig|rechnig|faktura)\b/i.test(x) && /(schreib|mach|erstell|stell)/i.test(x)) {
        const betrag = x.match(/(?:über|für|von)\s*(?:chf|fr\.?)?\s*(\d+(?:['’]\d{3})*(?:[.,]\d+)?)\s*(?:chf|franken|fr\.)?(?:\s+(?:für|wegen)\s+(.+))?/i);
        const std = x.match(/(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunden|h)\b.*?(?:à|a|zu|je)\s*(?:chf|fr\.?)?\s*(\d+(?:[.,]\d+)?)/i);
        const fuer = (x.match(/(?:an|für)\s+(?:den\s+|die\s+|kunde[n]?\s+)?([A-ZÄÖÜ][\wäöüé&.' -]+?)(?:\s+(?:über|mit|für)\b|$)/) || [])[1];
        if (std) schritte.push({ typ: 'rechnung', kunde: fuer || '', auftrag: af || '', positionen: [{ text: 'Arbeit' + (af ? ' ' + af : ''), menge: zahl(std[1]), preis: Math.round(zahl(std[2]) * 100) }] });
        else if (betrag && zahl(betrag[1]) > 0) schritte.push({ typ: 'rechnung', kunde: fuer || '', auftrag: af || '', positionen: [{ text: (betrag[2] || (af ? 'Arbeit ' + af : 'Leistung')).trim(), menge: 1, preis: Math.round(zahl(betrag[1]) * 100) }] });
        else schritte.push({ typ: 'auftrag_rechnung', auftrag: af || (x.match(/auftrag\s+(.+?)(?:\s+(?:und|mit)\b|$)/i) || [])[1] || '' });
        continue;
      }
      const ein = x.match(/plane\s+(.+?)\s+(?:für|am)\s+(.+?)(?:\s+(?:bei|auf|für)\s+(.+))?$/i);
      if (ein) { const d = datumAus(ein[2]); if (d) { schritte.push({ typ: 'einsatz', mitarbeiter: /^(ihn|sie|ihm|ihr)$/i.test(ein[1]) ? ma : nameAus(ein[1]) || ma, datum: d, von: zeitAus(ein[2]), auftrag: ein[3] || af || '' }); continue; } }
    }
    const ord = { mitarbeiter: 0, auftrag: 1, zuweisen: 2, einsatz: 3, rechnung: 9, auftrag_rechnung: 9 };
    schritte.sort((a, b) => (ord[a.typ] ?? 5) - (ord[b.typ] ?? 5));
    for (const z of schritte) if ((z.typ === 'auftrag_rechnung' || z.typ === 'rechnung') && !z.auftrag) z.auftrag = af || '';
    for (const z of schritte) { if (z.typ === 'zuweisen' || z.typ === 'einsatz') { z.mitarbeiter = z.mitarbeiter || ma || ''; if (z.typ === 'zuweisen') z.auftrag = z.auftrag || af || ''; } }
    return schritte;
  }

  /* ---------- Lizenz: jedes Werkzeug gehört zu einem Bereich ---------- */
  const BRAUCHT = {
    rechnung: ['rechnungen'], offerte: ['rechnungen'], kunde: ['rechnungen'], mahnen: ['rechnungen'],
    buchung: ['buchhaltung'], buchung_aendern: ['buchhaltung'], buchung_loeschen: ['buchhaltung'], journal: ['buchhaltung'], fahrt: ['buchhaltung'], kontostand: ['buchhaltung'],
    rechnung_bezahlt: [['rechnungen', 'buchhaltung']], lohnlauf: ['lohn'],
    mitarbeiter: ['zeit'], zuweisen: ['zeit'], einsatz: ['zeit'], spesen: ['zeit'], ferien: ['zeit'], mitteilung: ['zeit'],
    auftrag: ['zeit', 'projekte'], auftrag_rechnung: ['rechnungen', ['zeit', 'projekte']],
    lager: ['lager'], bereitstellen: ['lager', 'zeit'], termin: ['termine'], stelle: ['bewerbungen'],
    erinnerung: [], briefing: [], navigieren: [], zusatz: [],
  };
  const lizenz = () => { if (window.NASUVIA_LIZENZ) return window.NASUVIA_LIZENZ; try { return JSON.parse(localStorage.getItem('ordasio.lizenz') || 'null'); } catch { return null; } };
  const darf = (p) => { const O = window.ORDASIO, l = lizenz(); return !O || !l || !O.darf || O.darf(l, p); };
  // Fehlender Bereich für ein Werkzeug (oder null, wenn erlaubt)
  function fehltFuer(typ) {
    for (const b of BRAUCHT[typ] || []) { const eines = Array.isArray(b) ? b : [b]; if (!eines.some(darf)) return eines[0]; }
    return null;
  }
  const BEREICH_NAME = { rechnungen: 'Rechnungen', buchhaltung: 'Buchhaltung', zeit: 'Team & Zeit', projekte: 'Projekte & Lager', lager: 'Projekte & Lager', termine: 'Online-Termine', bewerbungen: 'Bewerbungen' };
  // Empfehlung statt Ausführen: Zusatzpaket (per Knopfdruck) oder grössere Hauptlizenz
  function empfehlung(programm, was) {
    const O = window.ORDASIO, l = lizenz() || {};
    const m = O && O.modulFuer && O.modulFuer(programm);
    if (m && O.kannBuchen(l, m.id)) return { html: `${esc(was)} gehört zum Zusatzpaket <b>${esc(m.name)}</b>, das in Ihrer Lizenz noch nicht drin ist. ${esc(m.erklaerung.split('. ')[0])}.<div class="ordi-chips" style="margin-top:8px"><button data-zusatz-info="${m.id}">So funktioniert es</button><button data-zusatz-buchen="${m.id}">Dazubuchen (CHF ${m.monat}/Mt.)</button></div>`, text: 'Empfehlung ' + m.name };
    const ab = O && O.ab ? O.ab(programm, l.rechtsform || 'einzel') : null;
    if (l.paket === 'privat') return { html: `${esc(was)} gibt es in den Firmenlizenzen. Ihr Home-Büro ist für die privaten Finanzen. Wenn Sie selbständig sind oder eine Firma führen: <b>${esc(ab ? ab.name : 'Selbständig')}</b> ab CHF ${ab ? ab.monat : 29} pro Monat, 30 Tage gratis.<div class="ordi-chips" style="margin-top:8px"><a class="ordi-hin" href="${WURZEL}lizenz/">Lizenzen ansehen ›</a></div>`, text: 'Empfehlung Firmenlizenz' };
    return { html: `${esc(was)} ist in Ihrer Lizenz nicht enthalten${ab ? `. Das gibt es ab <b>${esc(ab.name)}</b> (CHF ${ab.monat} pro Monat)` : ''}.<div class="ordi-chips" style="margin-top:8px"><a class="ordi-hin" href="${WURZEL}lizenz/">Lizenzen ansehen ›</a></div>`, text: 'Empfehlung' };
  }
  const WAS = { bereitstellen: 'Material bereitstellen lassen', rechnung: 'Rechnungen schreiben', offerte: 'Offerten', kunde: 'Kunden verwalten', mahnen: 'Mahnen', buchung: 'Buchen', buchung_aendern: 'Buchungen ändern', buchung_loeschen: 'Buchungen löschen', journal: 'Buchungssätze', fahrt: 'Fahrten', kontostand: 'Der Kontostand', rechnung_bezahlt: 'Zahlungen vermerken', lohnlauf: 'Der Lohnlauf', mitarbeiter: 'Mitarbeitende erfassen', zuweisen: 'Aufträge zuteilen', einsatz: 'Einsätze planen', spesen: 'Spesen', ferien: 'Ferienanträge', mitteilung: 'Mitteilungen ans Team', auftrag: 'Aufträge', auftrag_rechnung: 'Rechnungen zu Aufträgen', lager: 'Das Lager', termin: 'Online-Termine', stelle: 'Offene Stellen' };
  // Prüft eine Aktion (auch Pläne). Gibt { aktion } mit den erlaubten Schritten zurück, oder die Empfehlung.
  function pruefen(a) {
    if (!a) return null;
    const schritte = a.typ === 'plan' ? a.schritte : [a];
    const ok = [], nein = [];
    for (const z of schritte) { const f = fehltFuer(z.typ); if (f) nein.push({ z, f }); else ok.push(z); }
    if (!nein.length) return { aktion: a };
    const emp = empfehlung(nein[0].f, WAS[nein[0].z.typ] || 'Das');
    if (!ok.length) return emp;
    return { aktion: ok.length > 1 ? { typ: 'plan', schritte: ok } : ok[0], hinweis: emp };
  }


  /* ---------- Ordi als Buchhalter: direkt in der Buchhaltung arbeiten ---------- */
  const KAT_STD = {
    ausgabe: [['material', 'Material', 8.1], ['fremd', 'Subunternehmer und Fremdarbeiten', 8.1], ['werkzeug', 'Werkzeug und Kleingeräte', 8.1], ['anschaffung', 'Anschaffungen (Geräte, Maschinen)', 8.1],
      ['fahrzeug', 'Fahrzeug (Benzin, Service, Leasing)', 8.1], ['telefon', 'Telefon und Internet', 8.1], ['software', 'Software und Abos', 8.1], ['buero', 'Miete und Büro', 8.1], ['werbung', 'Werbung und Website', 8.1],
      ['spesen', 'Spesen und Verpflegung', 8.1], ['weiterbildung', 'Weiterbildung', 8.1], ['versicherung', 'Versicherungen', 0], ['bank', 'Bank- und Kartengebühren', 0], ['gebuehren', 'Gebühren und Abgaben', 0],
      ['loehne', 'Löhne', 0], ['sozial', 'Sozialversicherungen und Vorsorge', 0], ['fahrten', 'Fahrten (Kilometer)', 0], ['uebrig', 'Übriges', 8.1], ['steuern', 'Steuern (Gewinn und Kapital)', 0]],
    einnahme: [['dienstleistung', 'Dienstleistungen', 8.1], ['materialverkauf', 'Materialverkauf', 8.1], ['uebrig-ein', 'Übrige Einnahmen', 8.1]],
  };
  let einstCache = null;
  const einst = async () => (einstCache = (await idb('nasuvia-buchhaltung', 'einstellungen')).find((x) => x.id === 'haupt') || {});
  function kategorien(e) {
    if (window.NB && NB.kategorienListe) { const k = NB.kategorienListe(); return { ausgabe: k.aus, einnahme: k.ein }; }
    const eigen = (e && e.kategorien) || {};
    const misch = (std, x) => { const m = new Map(std.map(([id, name, satz]) => [id, { id, name, satz }])); for (const k of x || []) if (k && k.id) m.set(k.id, { ...(m.get(k.id) || { satz: 8.1 }), ...k }); return [...m.values()].filter((k) => !k.versteckt); };
    return { ausgabe: misch(KAT_STD.ausgabe, eigen.aus), einnahme: misch(KAT_STD.einnahme, eigen.ein) };
  }
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  function katFinden(text, typ, e) {
    const l = kategorien(e)[typ === 'einnahme' ? 'einnahme' : 'ausgabe'], n = norm(text);
    if (!n) return null;
    return l.find((k) => k.id === text) || l.find((k) => norm(k.name) === n) || l.find((k) => norm(k.name).includes(n) || n.includes(norm(k.name).split(/[ (]/)[0])) || null;
  }
  const mwstAus = (brutto, satz) => Math.round(brutto * satz / (100 + satz));
  // Schreiben in die Buchhaltung: über den Speicher der Seite, sonst direkt in die Datenbank auf dem Gerät
  function bhDb() {
    return new Promise((ok, f) => {
      const auf = (v) => { const r = v ? indexedDB.open('nasuvia-buchhaltung', v) : indexedDB.open('nasuvia-buchhaltung');
        r.onupgradeneeded = () => ['buchungen', 'belege', 'einstellungen', 'journal'].forEach((s) => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); });
        r.onsuccess = () => ok(r.result); r.onerror = () => (v ? auf(0) : f(r.error)); };
      auf(2);
    });
  }
  const neueId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  async function bhSchreiben(store, liste) {
    const jetzt = new Date().toISOString(), fertig = liste.map((e) => ({ ...e, id: e.id || neueId(), geaendert: jetzt, offen: true }));
    if (window.Speicher && Speicher.mehrereSpeichern) return Speicher.mehrereSpeichern(store, fertig);
    const db = await bhDb();
    await new Promise((ok, f) => { const t = db.transaction(store, 'readwrite'); fertig.forEach((e) => t.objectStore(store).put(e)); t.oncomplete = ok; t.onerror = () => f(t.error); });
    db.close(); return fertig;
  }
  async function nachher() { einstCache = null; try { if (window.NB && NB.neuLaden) await NB.neuLaden(); } catch {} }
  const festBis = (e) => (e && e.festBis) || '';
  // Buchungen finden: Suchtext (Partner, Text), Zeitraum, Betrag, Kategorie, Art oder Kurz-ID aus dem Kontext
  function filtern(liste, a, e) {
    const s = norm(a.suche), refs = [].concat(a.ref || []).filter(Boolean);
    const art = ['einnahme', 'ausgabe'].includes(a.art) ? a.art : '';
    const kAlt = a.kategorie_alt ? katFinden(a.kategorie_alt, art || 'ausgabe', e) : null;
    if (!s && !refs.length && !a.von && !a.bis && !a.betrag && !kAlt) return [];
    return liste.filter((b) => !b.geloescht && (!refs.length || refs.some((r) => String(b.id).startsWith(r)))
      && (!art || b.typ === art) && (!a.von || b.datum >= a.von) && (!a.bis || b.datum <= a.bis)
      && (!a.betrag || Math.abs(b.betragRappen) === Math.abs(a.betrag)) && (!kAlt || b.kategorie === kAlt.id)
      && (!s || norm(`${b.partner || ''} ${b.text || ''} ${b.rechnungNr || ''}`).includes(s)));
  }
  // Belege, die man Ordi gibt, bis zum Ausführen merken
  const belegZwischen = new Map();
  function belegMerken(datei) { const k = 'b' + Date.now().toString(36); belegZwischen.set(k, datei); return k; }
  async function belegFertig(datei) {
    let daten = datei, typ = datei.type || 'application/octet-stream';
    if (typ.startsWith('image/') && datei.size > 900000) {
      try {
        const bild = await createImageBitmap(datei), f = Math.min(1, 1800 / Math.max(bild.width, bild.height));
        const c = document.createElement('canvas'); c.width = Math.round(bild.width * f); c.height = Math.round(bild.height * f);
        c.getContext('2d').drawImage(bild, 0, 0, c.width, c.height);
        daten = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85)); typ = 'image/jpeg';
      } catch { /* Original behalten */ }
    }
    return { name: (datei.name || 'Beleg').replace(/\.(heic|png|webp)$/i, typ === 'image/jpeg' ? '.jpg' : '$&'), typ, daten };
  }

  // Vor der Vorschau: Treffer zählen und prüfen, damit die Karte genau sagt, was passiert
  async function vorbereiten(a) {
    if (!a) return a;
    if (a.typ === 'plan') return { ...a, schritte: await Promise.all((a.schritte || []).map(vorbereiten)) };
    if (['buchung_aendern', 'buchung_loeschen'].includes(a.typ)) {
      const e = await einst(), l = filtern(await idb('nasuvia-buchhaltung', 'buchungen'), a, e);
      return { ...a, _n: l.length, _fest: l.filter((b) => festBis(e) && b.datum <= festBis(e)).length, _beispiele: l.slice(0, 4).map((b) => `${dk(b.datum)} ${b.partner || b.text || ''} ${chf(b.betragRappen)}`) };
    }
    if (a.typ === 'rechnung_bezahlt') {
      const r = (await idb('nasuvia-rechnungen', 'rechnung')).filter((x) => (x.dokArt || 'rechnung') === 'rechnung' && !x.bezahlt);
      // Auch Rechnungen, die nur in der Buchhaltung stehen (z. B. importiert)
      for (const b of await idb('nasuvia-buchhaltung', 'buchungen')) if (b.quelle === 'rechnung' && !b.bezahlt && b.rechnungNr && !r.some((x) => String(x.nr) === String(b.rechnungNr))) r.push({ nr: b.rechnungNr, kunde: b.partner, betragRappen: b.betragRappen, faellig: b.faellig });
      const t = r.find((x) => a.nr && String(x.nr).trim() === String(a.nr).trim()) || (!a.nr && a.kunde ? r.filter((x) => norm(x.kunde).includes(norm(a.kunde))).sort((x, y) => (a.betrag ? Math.abs(x.betragRappen - a.betrag) - Math.abs(y.betragRappen - a.betrag) : 0))[0] : null);
      return { ...a, _rg: t ? { nr: t.nr, kunde: t.kunde, betrag: t.betragRappen } : null };
    }
    if (a.typ === 'buchung' && a.kategorie) { const k = katFinden(a.kategorie, a.art, await einst()); return { ...a, _kat: k ? k.name : '' }; }
    return a;
  }

  async function bhAusfuehren(a) {
    const e = await einst();
    const fest = (d) => festBis(e) && d && d <= festBis(e);
    if (a.typ === 'buchung') {
      const typ = a.art === 'einnahme' ? 'einnahme' : 'ausgabe', betrag = Math.abs(Math.round(Number(a.betrag) || 0));
      if (!betrag) { try { sessionStorage.setItem('ordasio.buchung', JSON.stringify(a)); } catch {} location.href = WURZEL + '?bereich=buchhaltung'; return 'Ich öffne das Buchungsfenster …'; }
      const datum = /^\d{4}-\d{2}-\d{2}$/.test(a.datum || '') ? a.datum : heute();
      if (fest(datum)) return `Bis ${dk(festBis(e))} ist die Buchhaltung festgeschrieben. Bitte ein späteres Datum nennen.`;
      const k = katFinden(a.kategorie, typ, e) || katFinden(typ === 'einnahme' ? 'uebrig-ein' : 'uebrig', typ, e);
      const satz = a.mwst != null && a.mwst !== '' && Number.isFinite(Number(a.mwst)) ? Number(a.mwst) : (k ? Number(k.satz) || 0 : 8.1);
      const b = { typ, datum, betragRappen: betrag, mwstSatz: satz, mwstRappen: a.mwst_betrag != null && a.mwst_betrag !== '' ? Math.round(Number(a.mwst_betrag)) : mwstAus(betrag, satz),
        kategorie: k ? k.id : (typ === 'einnahme' ? 'uebrig-ein' : 'uebrig'), partner: String(a.partner || '').slice(0, 120), text: String(a.text || '').slice(0, 200),
        zahlung: ['Bank', 'Karte', 'TWINT', 'Bar'].includes(a.zahlung) ? a.zahlung : 'Bank', quelle: 'ordi' };
      if (a._belegTemp && belegZwischen.has(a._belegTemp)) {
        const [g] = await bhSchreiben('belege', [await belegFertig(belegZwischen.get(a._belegTemp))]);
        b.belegId = g.id; belegZwischen.delete(a._belegTemp);
      }
      await bhSchreiben('buchungen', [b]); await nachher();
      return `✓ ${typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'} ${chf(betrag)}${b.partner ? ' ' + b.partner : ''} gebucht (${k ? k.name : 'Übriges'}, MWST ${satz} %, ${dk(datum)})${b.belegId ? ', Beleg abgelegt' : ''}.`;
    }
    if (a.typ === 'buchung_aendern' || a.typ === 'buchung_loeschen') {
      const alle = await idb('nasuvia-buchhaltung', 'buchungen'), l = filtern(alle, a, e).filter((b) => !fest(b.datum));
      if (!l.length) return 'Ich finde keine passende Buchung (oder sie liegt in der festgeschriebenen Zeit).';
      if (a.typ === 'buchung_loeschen') {
        if (window.Speicher && Speicher.mehrereLoeschen) await Speicher.mehrereLoeschen('buchungen', l.map((b) => b.id));
        else await bhSchreiben('buchungen', l.map((b) => ({ ...b, geloescht: true })));
        await nachher();
        return `✓ ${l.length} ${l.length === 1 ? 'Buchung' : 'Buchungen'} gelöscht. Sie finden sie unter „Zuletzt gelöscht“.`;
      }
      const neu = l.map((b) => {
        const x = { ...b };
        if (a.neu_kategorie) { const k = katFinden(a.neu_kategorie, b.typ, e); if (k) { x.kategorie = k.id; if (a.neu_mwst == null || a.neu_mwst === '') { x.mwstSatz = Number(k.satz) || 0; x.mwstRappen = mwstAus(x.betragRappen, x.mwstSatz); } } }
        if (a.neu_mwst != null && a.neu_mwst !== '' && Number.isFinite(Number(a.neu_mwst))) { x.mwstSatz = Number(a.neu_mwst); x.mwstRappen = mwstAus(x.betragRappen, x.mwstSatz); }
        if (/^\d{4}-\d{2}-\d{2}$/.test(a.neu_datum || '') && !fest(a.neu_datum)) x.datum = a.neu_datum;
        if (a.neu_text) x.text = String(a.neu_text).slice(0, 200);
        if (a.neu_partner) x.partner = String(a.neu_partner).slice(0, 120);
        if (['Bank', 'Karte', 'TWINT', 'Bar'].includes(a.neu_zahlung)) x.zahlung = a.neu_zahlung;
        if (a.neu_betrag) { x.betragRappen = Math.abs(Math.round(Number(a.neu_betrag))); x.mwstRappen = mwstAus(x.betragRappen, x.mwstSatz || 0); }
        return x;
      });
      await bhSchreiben('buchungen', neu); await nachher();
      return `✓ ${neu.length} ${neu.length === 1 ? 'Buchung' : 'Buchungen'} geändert.`;
    }
    if (a.typ === 'rechnung_bezahlt') {
      const p = await vorbereiten(a); if (!p._rg) return `Ich finde keine offene Rechnung${a.nr ? ' Nr. ' + a.nr : a.kunde ? ' von ' + a.kunde : ''}.`;
      const am = /^\d{4}-\d{2}-\d{2}$/.test(a.datum || '') ? a.datum : heute(), jetzt = new Date().toISOString();
      const rg = (await idb('nasuvia-rechnungen', 'rechnung')).filter((x) => String(x.nr) === String(p._rg.nr) && (x.dokArt || 'rechnung') === 'rechnung');
      await new Promise((ok) => { const r = indexedDB.open('nasuvia-rechnungen'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('rechnung')) { db.close(); return ok(); } const t = db.transaction('rechnung', 'readwrite'); rg.forEach((x) => t.objectStore('rechnung').put({ ...x, bezahlt: true, bezahltAm: am, geaendert: jetzt, offen: true })); t.oncomplete = () => { db.close(); ok(); }; t.onerror = () => { db.close(); ok(); }; }; r.onerror = () => ok(); });
      const bu = (await idb('nasuvia-buchhaltung', 'buchungen')).filter((b) => b.quelle === 'rechnung' && String(b.rechnungNr) === String(p._rg.nr));
      if (bu.length) await bhSchreiben('buchungen', bu.map((b) => ({ ...b, bezahlt: true, bezahltAm: am })));
      await nachher();
      return `✓ Rechnung Nr. ${p._rg.nr}${p._rg.kunde ? ' (' + p._rg.kunde + ')' : ''} über ${chf(p._rg.betrag)} ist als bezahlt vermerkt (${dk(am)}).`;
    }
    if (a.typ === 'journal') {
      const zeilen = (a.zeilen || []).map((z) => ({ soll: String(z.soll || '').trim(), haben: String(z.haben || '').trim(), betrag: Math.abs(Math.round(Number(z.betrag) || 0)) })).filter((z) => /^\d{4}$/.test(z.soll) && /^\d{4}$/.test(z.haben) && z.betrag);
      if (!zeilen.length) return 'Für den Buchungssatz brauche ich Soll-Konto, Haben-Konto (je vierstellig) und den Betrag.';
      const datum = /^\d{4}-\d{2}-\d{2}$/.test(a.datum || '') ? a.datum : heute();
      if (fest(datum)) return `Bis ${dk(festBis(e))} ist die Buchhaltung festgeschrieben.`;
      const nr = (await idb('nasuvia-buchhaltung', 'journal')).length + 1;
      await bhSchreiben('journal', [{ datum, beleg: 'O-' + nr, text: String(a.text || 'Buchung über Ordi').slice(0, 200), art: 'manuell', zeilen, geloescht: false }]); await nachher();
      return `✓ Buchungssatz gespeichert: ${zeilen.map((z) => `${z.soll} an ${z.haben} ${chf(z.betrag)}`).join(', ')}.${e.doppelt || /gmbh|ag|genossenschaft|verein|stiftung/.test((lizenz() || {}).rechtsform || '') ? '' : ' Sichtbar ist er, sobald die doppelte Buchhaltung eingeschaltet ist.'}`;
    }
    if (a.typ === 'fahrt') {
      const km = Math.abs(Number(a.km) || 0) * (a.retour ? 2 : 1); if (!km) return 'Wie viele Kilometer?';
      const datum = /^\d{4}-\d{2}-\d{2}$/.test(a.datum || '') ? a.datum : heute(); if (fest(datum)) return `Bis ${dk(festBis(e))} ist die Buchhaltung festgeschrieben.`;
      const ansatz = Number(e.kmAnsatz) || 0.7;
      await bhSchreiben('buchungen', [{ typ: 'ausgabe', quelle: 'fahrt', kategorie: 'fahrten', datum, km, kmAnsatz: ansatz, betragRappen: Math.round(km * ansatz * 100), mwstSatz: 0, mwstRappen: 0, text: String(a.zweck || `Fahrt ${km} km`).slice(0, 200), partner: '', zahlung: 'Bar' }]); await nachher();
      return `✓ Fahrt ${km} km gebucht: ${chf(Math.round(km * ansatz * 100))} (${ansatz.toFixed(2)} pro km).`;
    }
    if (a.typ === 'kontostand') {
      const b = Math.round(Number(a.betrag)); if (!Number.isFinite(b)) return 'Welcher Kontostand?';
      await bhSchreiben('einstellungen', [{ ...e, id: 'haupt', liquiStand: { betragRappen: b, datum: /^\d{4}-\d{2}-\d{2}$/.test(a.datum || '') ? a.datum : heute(), quelle: 'hand' } }]); await nachher();
      return `✓ Kontostand ${chf(b)} eingetragen. Die Liquiditätsvorschau rechnet ab jetzt damit.`;
    }
    if (a.typ === 'lohnlauf') {
      const monat = /^\d{4}-\d{2}$/.test(a.monat || '') ? a.monat : heute().slice(0, 7);
      if (window.NB && NB.lohnBuchen) { await NB.lohnBuchen(monat); return `✓ Lohnlauf ${monat} gebucht.`; }
      try { sessionStorage.setItem('ordasio.nb', JSON.stringify({ fn: 'lohnBuchen', monat })); } catch {}
      location.href = WURZEL + '?bereich=buchhaltung'; return 'Ich buche den Lohnlauf in der Buchhaltung …';
    }
    return null;
  }

  // Ohne KI: die häufigsten Aufträge selbst verstehen
  async function erkennen(frage) { const e = await erkennenRoh(frage); if (e && e.aktion) { const p = pruefen(e.aktion); return p && p.hinweis ? { ...p, vorher: p.hinweis } : p; } return e; }
  async function erkennenRoh(frage) {
    const t = frage.trim(), n = t.toLowerCase(); let m;
    if (/(mitarbeiter|auftrag|teile .* zu|weise .* zu|plane )/i.test(t) && !/^\s*rechnung\s+(an|für)\b/i.test(t)) {
      const s2 = teamPlan(t);
      const fehlt = s2.find((z) => z.typ === 'zuweisen' && (!z.mitarbeiter || !z.auftrag));
      const ohneAuftrag = s2.find((z) => z.typ === 'auftrag_rechnung' && !z.auftrag);
      if (ohneAuftrag) return { text: 'Für welchen Auftrag soll ich die Rechnung machen? Sagen Sie z. B.: «Schreib die Rechnung für den Auftrag Badsanierung Müller».' };
      if (fehlt) return { text: !fehlt.auftrag ? 'Welchen Auftrag soll ich zuteilen? Sagen Sie z. B.: «Erstelle den Auftrag Badsanierung Müller und teile ihn Luca zu».' : 'Wem soll ich den Auftrag zuteilen? Nennen Sie bitte den Namen.' };
      if (s2.length > 1) return { aktion: { typ: 'plan', schritte: s2 } };
      if (s2.length === 1) return { aktion: s2[0] };
    }
    // Zusatzpaket: „Ich möchte das Paket Verkauf Plus“
    if ((m = n.match(/(?:buche|buchen|will|möchte|interessiert|was ist|was bringt)\b.*?\b(team & zeit|team|löhne|lohn|projekte|lager|verkauf plus|verkauf|finanzen plus|finanzen|bewerbungen)\b/)) && /(paket|zusatz|buchen|möchte|will|was bringt|was ist)/.test(n)) {
      const id = { 'team & zeit': 'team', team: 'team', löhne: 'lohn', lohn: 'lohn', projekte: 'projekte', lager: 'projekte', 'verkauf plus': 'verkauf', verkauf: 'verkauf', 'finanzen plus': 'finanzen', finanzen: 'finanzen', bewerbungen: 'bewerbungen' }[m[1]];
      if (id) return { aktion: { typ: 'zusatz', modul: id } };
    }
    // Briefing: „Briefing jeden Montag um 7“, „Briefing täglich“, „Briefing aus“
    if (/\bbriefing\b/.test(n) && /(jeden|täglich|werktags|wöchentlich|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|um \d|aus|ein|an)\b/.test(n)) {
      const TAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
      const tag = TAGE.findIndex((x) => n.includes(x));
      return { aktion: { typ: 'briefing', an: !/\baus\b|ausschalten|stopp/.test(n), rhythmus: /täglich|jeden tag/.test(n) ? 'taeglich' : /werktag|montag bis freitag/.test(n) ? 'werktags' : 'woechentlich', tag: tag >= 0 ? tag + 1 : 1, zeit: zeitAus(t) || '07:30' } };
    }
    // Buchung: „Buche 45.20 Migros als Material“, „Ausgabe 89 Swisscom Telefon“, „Einnahme 500 von Huber“
    if ((m = t.match(/^(?:buche|verbuche|erfasse|ausgabe|einnahme|bezahlt|bezahlte)\b\s*(?:eine\s+)?(?:ausgabe|einnahme)?\s*(?:von\s+)?(?:chf|fr\.?)?\s*(\d+(?:['’]\d{3})*(?:[.,]\d+)?)\s*(?:chf|franken|fr\.)?\s+(?:bei|an|von|für)?\s*(.+?)(?:\s+(?:als|unter|kategorie)\s+(.+?))?(?:\s+(?:am|vom)\s+(.+))?$/i)) && !/\b(m|meter|stk|stück)\b/i.test(t)) {
      const ein = /einnahme|von\s/i.test(t.slice(0, 30)) && !/ausgabe/i.test(t);
      return { aktion: { typ: 'buchung', art: ein ? 'einnahme' : 'ausgabe', betrag: Math.round(zahl(m[1]) * 100), partner: m[2].trim(), kategorie: (m[3] || '').trim(), datum: (m[4] && datumAus(m[4])) || heute() } };
    }
    // Rechnung bezahlt: „Rechnung 1023 ist bezahlt“, „Rechnung Nr. 12 bezahlt am 3.12.“
    if ((m = t.match(/^(?:die\s+)?rechnung\s+(?:nr\.?\s*)?([\w-]+)\s+(?:ist\s+|wurde\s+)?bezahlt(?:\s+(?:am|vom)\s+(.+))?$/i)) && /\d/.test(m[1])) return { aktion: { typ: 'rechnung_bezahlt', nr: m[1], datum: (m[2] && datumAus(m[2])) || heute() } };
    // Fahrt: „Fahrt 45 km nach Zürich“, „45 km Kunde Müller hin und zurück“
    if ((m = t.match(/^(?:fahrt\s+)?(\d+(?:[.,]\d+)?)\s*km\b\s*(.*)$/i)) && (/^fahrt/i.test(t) || /km/i.test(t))) {
      const rest = m[2] || '';
      return { aktion: { typ: 'fahrt', km: zahl(m[1]), retour: /hin und zur|retour|zurück/i.test(rest), zweck: rest.replace(/\b(hin und zurück|retour)\b/gi, '').replace(/^(nach|zu|für)\s+/i, '').trim(), datum: datumAus(rest) || heute() } };
    }
    // Kontostand: „Kontostand 12'480.50“
    if ((m = t.match(/^(?:mein\s+|der\s+)?kontostand\s+(?:ist\s+)?(?:chf\s*)?(-?\d+(?:['’]\d{3})*(?:[.,]\d+)?)/i))) return { aktion: { typ: 'kontostand', betrag: Math.round(zahl(m[1]) * 100) } };
    // Bereitstellen: „Stelle 30 Meter Kabel zur Verfügung für Robert“, „Fabian soll 30 m Kabel für Robert bereitstellen“
    {
      let lagerist = '', tx = t;
      const soll = tx.match(/^([a-zäöüé][\wäöüé-]*)\s+soll\s+(.+)$/i); if (soll) { lagerist = soll[1]; tx = soll[2]; }
      const b = tx.match(/^(?:bitte\s+)?(?:(?:stell\w*|richt\w*|rüst\w*|bereitstell\w*|leg\w*|gib|mach\w*)\s+)?(\d+(?:[.,]\d+)?)\s*(m|meter|stk\.?|stück|kg|l|liter|rollen?|packungen?|säcke?|dosen?|kartons?|x)?\s+(.+?)\s+(?:zur\s+verfügung\s+|bereit\s+)?für\s+(.+)$/i);
      if (b && (soll || /bereit|verfügung|rüst|richt/i.test(t))) {
        const toks = b[4].replace(/[.!?]+$/, '').split(/\s+/), STOPP = /^(bereit|bereitstellen|zur|verfügung|an|durch|von|über|auf|bis|morgen|heute|übermorgen|am|im|in|beim|ins|und|bitte|hin|zum|zu|stellen|richten|rüsten)$/i;
        const nm = []; let i = 0; while (i < toks.length && !STOPP.test(toks[i]) && nm.length < 2) nm.push(toks[i++]);
        const rest = toks.slice(i).join(' ');
        const an = (rest.match(/\b(?:an|durch|über)\s+([a-zäöüé][\wäöüé-]*)/i) || [])[1] || lagerist;
        const auf = (rest.match(/\bauf\s+(?:den\s+)?(?:auftrag\s+)?(.+?)(?:\s+bis\b.*)?$/i) || [])[1] || '';
        const bisT = (rest.match(/\bbis\s+(.+)$/i) || [])[1] || (/\b(morgen|übermorgen|heute)\b/i.test(rest) ? rest : '');
        const einh = { meter: 'm', m: 'm', 'stk.': 'Stk', stk: 'Stk', 'stück': 'Stk', x: 'Stk' }[String(b[2] || '').toLowerCase()] || b[2] || '';
        if (nm.length) return { aktion: { typ: 'bereitstellen', menge: zahl(b[1]), einheit: einh, artikel: b[3].replace(/\s+zur\s+verfügung$/i, '').trim(), fuer: nm.join(' '), an, auftrag: auf.trim(), bis: bisT ? datumAus(bisT) || '' : '' } };
      }
    }
    // Lager: „6 Meter Kupferrohr auf Badsanierung Müller“, „Eingang 20 Stück Silikon“
    if ((m = t.match(/^(?:(eingang|ausgang|nimm|verbrauche|brauche|buche)\s+)?(\d+(?:[.,]\d+)?)\s*(m|meter|stk\.?|stück|kg|l|liter|rollen?|packungen?|säcke?|dosen?)\s+(.+?)(?:\s+(?:auf|für)\s+(?:den\s+)?(?:auftrag\s+)?(.+))?$/i))) {
      return { aktion: { typ: 'lager', art: /eingang/i.test(m[1] || '') ? 'eingang' : 'ausgang', menge: zahl(m[2]), artikel: m[4].trim(), auftrag: (m[5] || '').trim() } };
    }
    // Kunde: „Neuer Kunde Huber AG, Seestrasse 4, 6006 Luzern, info@huber.ch“
    if ((m = t.match(/^(?:neuer\s+kunde|kunde\s+(?:anlegen|erfassen|hinzufügen)|(?:erfasse|lege|füge)\s+(?:den\s+|einen\s+)?(?:neuen\s+)?kunden?)\s*(?:an|hinzu)?[:,]?\s*(.+)$/i))) {
      const teile = m[1].split(',').map((x) => x.trim()).filter(Boolean);
      const mail = (teile.find((x) => /@/.test(x)) || ''), plzOrt = teile.find((x) => /^\d{4}\s+\S/.test(x)) || '';
      const str = teile.find((x, i) => i > 0 && x !== mail && x !== plzOrt && /\d/.test(x)) || '';
      return { aktion: { typ: 'kunde', name: teile[0].replace(/\s+(an|hinzu)$/i, ''), strasse: str, plz: (plzOrt.match(/^\d{4}/) || [''])[0], ort: plzOrt.replace(/^\d{4}\s+/, ''), mail } };
    }
    // Termin: „Termin mit Frau Keller am Freitag um 14 Uhr, 45 Minuten“
    if ((m = t.match(/^(?:trag\w*\s+)?(?:einen\s+)?termin\s+(?:mit|für)\s+(.+?)\s+((?:am|heute|morgen|übermorgen|nächsten?|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|in \d+).*)$/i))) {
      const datum = datumAus(m[2]), zeit = zeitAus(m[2]), dauer = (m[2].match(/(\d+)\s*(?:min|minuten)/i) || [])[1] || ((m[2].match(/(\d+(?:[.,]\d+)?)\s*(?:std|stunden?)/i) || [])[1] ? Math.round(zahl(m[2].match(/(\d+(?:[.,]\d+)?)\s*(?:std|stunden?)/i)[1]) * 60) : 60);
      if (datum && zeit) return { aktion: { typ: 'termin', name: m[1].replace(/^(frau|herr|herrn)\s+/i, (x) => x).trim(), datum, zeit, dauer: Number(dauer) } };
      return { text: 'Wann soll der Termin sein? Sagen Sie z. B.: «Termin mit Frau Keller am Freitag um 14 Uhr».' };
    }
    // Ferien und Spesen: „Genehmige die Ferien von Sara“, „Lehne die Spesen von Tom ab“
    if ((m = t.match(/^(genehmige|bewillige|akzeptiere|lehne)\s+(?:die\s+|den\s+)?(ferien|ferienantrag|antrag|anträge|abwesenheit|spesen)\s+(?:von\s+)?([a-zäöüé]+(?:\s+[a-zäöüé]+)?)/i))) {
      return { aktion: { typ: /spesen/i.test(m[2]) ? 'spesen' : 'ferien', entscheid: /lehne/i.test(m[1]) ? 'abgelehnt' : 'genehmigt', mitarbeiter: m[3].replace(/\s+ab$/i, '') } };
    }
    // Mitteilung: „Schick dem Team: Morgen Start um 7 Uhr beim Lager“
    if ((m = t.match(/^(?:schick\w*|send\w*|schreib\w*)\s+(?:eine\s+)?(?:mitteilung\s+)?(?:an\s+)?(?:alle|dem\s+team|das\s+team|ans\s+team|den\s+mitarbeitenden)\s*[:,]?\s*(.+)$/i))) {
      return { aktion: { typ: 'mitteilung', titel: m[1].split(/[.!?]/)[0].slice(0, 80), text: m[1], wichtig: /wichtig|dringend|achtung/i.test(m[1]) } };
    }
    // Offerte wie Rechnung
    if ((m = t.match(/offerte\s+(?:an|für)\s+(.+?)\s+(?:über|für|mit)\s+(.+)$/i))) {
      const r2 = await erkennenRoh('Rechnung an ' + m[1] + ' über ' + m[2]);
      if (r2 && r2.aktion && r2.aktion.typ === 'rechnung') return { aktion: { ...r2.aktion, typ: 'offerte' } };
    }
    // Rechnung: „Rechnung an Müller über 3 Stunden à 95“, „Rechnung für Huber AG über CHF 500 für Gartenarbeit“
    if ((m = t.match(/rechnung\s+(?:an|für)\s+(.+?)\s+(?:über|für|mit)\s+(.+)$/i))) {
      const kunde = m[1].trim(), rest = m[2]; let pos = null, x;
      if ((x = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunden|h)\b(?:\s+(.+?))?\s+(?:à|a|zu|je|für)\s*(?:chf|fr\.?)?\s*(\d+(?:[.,]\d+)?)/i))) pos = [{ text: (x[2] && !/^(à|a|zu)$/i.test(x[2]) ? x[2] : 'Arbeit'), menge: zahl(x[1]), preis: Math.round(zahl(x[3]) * 100) }];
      else if ((x = rest.match(/(?:chf|fr\.?)?\s*(\d+(?:['’]\d{3})*(?:[.,]\d+)?)(?:\s*(?:chf|franken|fr\.)(?=\s|$))?(?:\s+(?:für|wegen)\s+(.+))?/i))) pos = [{ text: (x[2] || 'Leistung').trim(), menge: 1, preis: Math.round(zahl(x[1]) * 100) }];
      if (pos && pos[0].preis > 0) return { aktion: { typ: 'rechnung', kunde, positionen: pos } };
    }
    // Erinnerung: „Erinnere mich morgen um 9 an die Offerte für Keller“
    if ((m = t.match(/^erinner(?:e|n)?\s+(?:mich|uns)\s+(.*)$/i))) {
      const rest = m[1], datum = datumAus(rest) || plusTage(heute(), 1), zeit = zeitAus(rest);
      const titel = rest.replace(/\b(heute|morgen|übermorgen|in \d+ (tagen?|wochen?)|am \d{1,2}\.\d{1,2}\.?(\d{2,4})?|nächsten? \w+|(am )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)|um \d{1,2}([:.]\d{2})?\s*(uhr)?)\b/gi, '').replace(/^\s*(an|daran,?|dass)\s+/i, '').replace(/^\s*(die|den|das|der)\s+/i, '').replace(/\s+/g, ' ').trim();
      if (titel) return { aktion: { typ: 'erinnerung', titel: titel.charAt(0).toUpperCase() + titel.slice(1), datum, zeit } };
    }
    // Mahnen
    if (/(mahn|erinner).*(alle|überfällig|säumig|offen)/.test(n)) return { aktion: { typ: 'mahnen' } };
    // Stelle ausschreiben: „Stelle für Maler 80%“
    if ((m = t.match(/(?:stelle|inserat|job)\s+(?:für|als)\s+(?:eine?n?\s+)?([a-zäöüé/ -]+?)(?:\s+(\d{2,3})\s*(?:-|–|bis)?\s*(\d{2,3})?\s*%)?$/i))) return { aktion: { typ: 'stelle', beruf: m[1].trim(), pensum: m[2] ? (m[3] ? `${m[2]}–${m[3]} %` : `${m[2]} %`) : '' } };
    // Zahlen
    if (/(umsatz|einnahmen|ausgaben|gewinn|verdient)/.test(n)) {
      const k = await kontext(); const h = k.heute;
      let von = h.slice(0, 7), bis = von, name = 'diesem Monat';
      const mi = MONATE.findIndex((x) => n.includes(x));
      if (/letzt(en|er) monat|vormonat/.test(n)) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); von = bis = d.toLocaleDateString('sv-SE').slice(0, 7); name = 'im letzten Monat'; }
      else if (mi >= 0) { const jj = (n.match(/20\d{2}/) || [])[0] || (mi + 1 > Number(h.slice(5, 7)) ? String(Number(h.slice(0, 4)) - 1) : h.slice(0, 4)); von = bis = `${jj}-${String(mi + 1).padStart(2, '0')}`; name = `im ${MONATE[mi].charAt(0).toUpperCase() + MONATE[mi].slice(1)} ${jj}`; }
      else if ((m = n.match(/20\d{2}/)) || /dieses jahr|jahr/.test(n)) { const jj = m ? m[0] : h.slice(0, 4); von = jj + '-01'; bis = jj + '-12'; name = 'im Jahr ' + jj; }
      let ein = 0, aus = 0; for (const [mm, w] of Object.entries(k.monate)) if (mm >= von && mm <= bis) { ein += w.ein; aus += w.aus; }
      return { html: `<b>${esc(name.charAt(0).toUpperCase() + name.slice(1))}</b> (ohne MWST):<br>Einnahmen <b>${chf(ein)}</b><br>Ausgaben <b>${chf(aus)}</b><br>Gewinn <b>${chf(ein - aus)}</b>`, text: `Einnahmen ${chf(ein)}, Ausgaben ${chf(aus)}`, ziel: WURZEL + '?bereich=buchhaltung' };
    }
    if (/(offene|überfällige|unbezahlte)\s+rechnung|wer (hat|schuldet).*(bezahlt|geld)/.test(n)) {
      const k = await kontext();
      return { html: `Offen: <b>${k.offen.anzahl}</b> Rechnungen, ${chf(k.offen.summe)}.<br>Davon überfällig: <b>${k.ueberfaellig.anzahl}</b>, ${chf(k.ueberfaellig.summe)}${k.ueberfaellig.liste.length ? '<br>' + k.ueberfaellig.liste.map((x) => `· Nr. ${esc(x.nr)} ${esc(x.kunde || '')}: ${chf(x.betrag)}`).join('<br>') : ''}`,
        text: `${k.offen.anzahl} offene Rechnungen`, chips: k.ueberfaellig.anzahl ? ['Erinnere alle überfälligen Kunden'] : [] };
    }
    if (/(kontostand|reicht das geld|liquidität|wie viel geld)/.test(n)) {
      const k = await kontext();
      return { html: k.kontostand ? `Kontostand ${chf(k.kontostand.betragRappen)} (Stand ${dk(k.kontostand.datum)}). Die Vorschau auf 12 Wochen zeigt, ob es reicht.` : 'Ich kenne Ihren Kontostand noch nicht. Laden Sie einen Bankauszug oder tragen Sie ihn in der Liquiditätsvorschau ein.', text: 'Kontostand', ziel: WURZEL + '?bereich=buchhaltung&ansicht=liquiditaet' };
    }
    return null;
  }

  // Vorschau-Karte
  const TITEL = { bereitstellen: '📦 Material bereitstellen', offerte: '🧾 Offerte vorbereiten', buchung: '🧾 Buchung erfassen', lager: '📦 Material buchen', kunde: '👤 Kunde erfassen', termin: '📅 Termin eintragen', ferien: '🏖 Ferienantrag', spesen: '🧾 Spesen', mitteilung: '📣 Mitteilung ans Team', briefing: '☀ Briefing einstellen', zusatz: '📦 Zusatzpaket', auftrag_rechnung: '🧾 Rechnung zum Auftrag', plan: '📋 Mehrere Schritte', buchung_aendern: 'Buchungen ändern', buchung_loeschen: 'Buchungen löschen', rechnung_bezahlt: 'Zahlung vermerken', journal: 'Buchungssatz', fahrt: 'Fahrt buchen', kontostand: 'Kontostand', lohnlauf: 'Lohnlauf buchen', mitarbeiter: '👤 Mitarbeiter erfassen', auftrag: '📍 Auftrag erstellen', zuweisen: '🔗 Auftrag zuteilen', rechnung: '🧾 Rechnung vorbereiten', erinnerung: '🔔 Erinnerung eintragen', mahnen: '⏰ Überfällige erinnern', stelle: '🧑‍💼 Offene Stelle vorbereiten', einsatz: '🗓️ Einsatz planen', navigieren: '➡️ Hinführen' };
  const schrittText = (a) => ({
    mitarbeiter: () => `Mitarbeiter <b>${esc(a.name)}</b> erfassen${a.stundenlohn ? ', Stundenlohn ' + chf(a.stundenlohn) : ''}${a.ansatz ? ', Ansatz ' + chf(a.ansatz) : ''}`,
    auftrag: () => `Auftrag <b>${esc(a.name)}</b> erstellen${a.kunde ? ' für ' + esc(a.kunde) : ''}${a.adresse ? ', ' + esc(a.adresse) : ''}`,
    zuweisen: () => `Auftrag <b>${esc(a.auftrag)}</b> an <b>${esc(a.mitarbeiter)}</b> zuteilen`,
    rechnung: () => `Rechnung${a.kunde ? ' an <b>' + esc(a.kunde) + '</b>' : a.auftrag ? ' zum Auftrag <b>' + esc(a.auftrag) + '</b>' : ''}: ${(a.positionen || []).map((p) => `${esc(p.text)} ${Number(p.menge).toLocaleString('de-CH')} × ${chf(p.preis)}`).join(', ')} vorbereiten`,
    offerte: () => `Offerte an <b>${esc(a.kunde)}</b>: ${(a.positionen || []).map((p) => `${esc(p.text)} ${Number(p.menge).toLocaleString('de-CH')} × ${chf(p.preis)}`).join(', ')}`,
    buchung: () => `${a.art === 'einnahme' ? 'Einnahme' : 'Ausgabe'} <b>${chf(a.betrag)}</b>${a.partner ? ' · ' + esc(a.partner) : ''}${a._kat || a.kategorie ? ' · ' + esc(a._kat || a.kategorie) : ''}${a.mwst != null && a.mwst !== '' ? ' · MWST ' + esc(a.mwst) + ' %' : ''} · ${dk(a.datum || heute())}${a.text ? '<br>' + esc(a.text) : ''}${a._belegTemp ? '<br><small>Mit Beleg</small>' : ''}${a.betrag ? '' : '<br><small>Das Buchungsfenster öffnet sich, Sie ergänzen den Betrag.</small>'}`,
    buchung_aendern: () => `${a._n != null ? `<b>${a._n} ${a._n === 1 ? 'Buchung' : 'Buchungen'}</b>` : 'Buchungen'}${a.suche ? ' mit «' + esc(a.suche) + '»' : ''}${a.von || a.bis ? ` (${dk(a.von) || '…'} bis ${dk(a.bis) || '…'})` : ''} ändern:${a.neu_kategorie ? ' Kategorie ' + esc(a.neu_kategorie) : ''}${a.neu_mwst != null && a.neu_mwst !== '' ? ', MWST ' + esc(a.neu_mwst) + ' %' : ''}${a.neu_datum ? ', Datum ' + dk(a.neu_datum) : ''}${a.neu_text ? ', Text «' + esc(a.neu_text) + '»' : ''}${a.neu_partner ? ', Partner ' + esc(a.neu_partner) : ''}${a.neu_zahlung ? ', bezahlt mit ' + esc(a.neu_zahlung) : ''}${a.neu_betrag ? ', Betrag ' + chf(a.neu_betrag) : ''}${(a._beispiele || []).length ? '<br><small>' + a._beispiele.map(esc).join('<br>') + (a._n > 4 ? '<br>…' : '') + '</small>' : ''}${a._fest ? `<br><small>${a._fest} davon sind festgeschrieben und bleiben.</small>` : ''}`,
    buchung_loeschen: () => `${a._n != null ? `<b>${a._n} ${a._n === 1 ? 'Buchung' : 'Buchungen'}</b>` : 'Buchungen'}${a.suche ? ' mit «' + esc(a.suche) + '»' : ''} löschen${(a._beispiele || []).length ? '<br><small>' + a._beispiele.map(esc).join('<br>') + (a._n > 4 ? '<br>…' : '') + '</small>' : ''}<br><small>Gelöschtes finden Sie unter „Zuletzt gelöscht“.</small>`,
    rechnung_bezahlt: () => a._rg ? `Rechnung Nr. <b>${esc(a._rg.nr)}</b>${a._rg.kunde ? ' · ' + esc(a._rg.kunde) : ''} · ${chf(a._rg.betrag)} als bezahlt vermerken (${dk(a.datum || heute())})` : `Rechnung ${a.nr ? 'Nr. ' + esc(a.nr) : esc(a.kunde || '')} als bezahlt vermerken<br><small>Ich finde sie noch nicht unter den offenen Rechnungen.</small>`,
    journal: () => `${dk(a.datum || heute())} · ${esc(a.text || '')}<br>${(a.zeilen || []).map((z) => `<b>${esc(z.soll)}</b> an <b>${esc(z.haben)}</b> ${chf(z.betrag)}`).join('<br>')}`,
    fahrt: () => `<b>${(Number(a.km) || 0) * (a.retour ? 2 : 1)} km</b>${a.zweck ? ' · ' + esc(a.zweck) : ''} · ${dk(a.datum || heute())}`,
    kontostand: () => `Kontostand <b>${chf(a.betrag)}</b>${a.datum ? ' per ' + dk(a.datum) : ''}`,
    lohnlauf: () => `Lohnlauf <b>${esc(a.monat || heute().slice(0, 7))}</b> buchen: Löhne, Arbeitgeberbeiträge und Spesen`,
    bereitstellen: () => `<b>${Number(a.menge).toLocaleString('de-CH')} ${esc(a.einheit || '')} ${esc(a.artikel)}</b> für <b>${esc(a.fuer)}</b>${a.an ? '<br>Lager: ' + esc(a.an) : '<br>Lager: alle, die das Lager führen'}${a.auftrag ? '<br>Auftrag: ' + esc(a.auftrag) : ''}${a.bis ? '<br>Bis ' + dk(a.bis) : ''}<br><small>Das Lager sieht es auf dem Handy und stellt es bereit.</small>`,
    lager: () => `${a.art === 'eingang' ? 'Eingang' : 'Verbrauch'}: <b>${Number(a.menge).toLocaleString('de-CH')} ${esc(a.artikel)}</b>${a.auftrag ? ' auf Auftrag <b>' + esc(a.auftrag) + '</b>' : ''}`,
    kunde: () => `<b>${esc(a.name)}</b>${a.strasse ? '<br>' + esc(a.strasse) : ''}${a.plz || a.ort ? '<br>' + esc([a.plz, a.ort].filter(Boolean).join(' ')) : ''}${a.mail ? '<br>' + esc(a.mail) : ''}`,
    termin: () => `<b>${esc(a.name)}</b><br>${dk(a.datum)} um ${esc(a.zeit)}, ${a.dauer || 60} Minuten`,
    ferien: () => `Offene Anträge von <b>${esc(a.mitarbeiter)}</b> ${a.entscheid === 'abgelehnt' ? 'ablehnen' : 'genehmigen'}`,
    spesen: () => `Offene Spesen von <b>${esc(a.mitarbeiter)}</b> ${a.entscheid === 'abgelehnt' ? 'ablehnen' : 'genehmigen'}`,
    mitteilung: () => `An alle Mitarbeitenden${a.wichtig ? ' (wichtig)' : ''}:<br>„${esc(a.text)}“`,
    briefing: () => a.an === false ? 'Briefing ausschalten' : `Briefing ${a.rhythmus === 'taeglich' ? 'täglich' : a.rhythmus === 'werktags' ? 'werktags' : 'jeden ' + ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'][(a.tag || 1) - 1]} um ${esc(a.zeit || '07:30')}`,
    zusatz: () => { const m = window.ORDASIO && ORDASIO.modul(a.modul); return m ? `<b>${esc(m.name)}</b>: ${esc(m.kurz)}, CHF ${m.monat} pro Monat<br><small>Ich zeige Ihnen, wie es funktioniert. Buchen entscheiden Sie dort.</small>` : esc(a.modul); },
    auftrag_rechnung: () => `Rechnung zum Auftrag <b>${esc(a.auftrag)}</b> vorbereiten (alle noch nicht verrechneten Stunden, Material und Fahrspesen)`,
    einsatz: () => `Einsatz für <b>${esc(a.mitarbeiter)}</b> am ${dk(a.datum)}${a.von ? ' um ' + esc(a.von) : ''}${a.auftrag ? ' (' + esc(a.auftrag) + ')' : ''}`,
  }[a.typ] || (() => esc(TITEL[a.typ] || a.typ)))();
  function karte(a) {
    let inhalt = '';
    if (a.typ === 'plan') inhalt = `<ol style="margin:0;padding-left:18px">${(a.schritte || []).map((z) => `<li>${schrittText(z)}</li>`).join('')}</ol>`;
    if (['bereitstellen', 'mitarbeiter', 'auftrag', 'zuweisen', 'auftrag_rechnung', 'offerte', 'buchung', 'lager', 'kunde', 'termin', 'ferien', 'spesen', 'mitteilung', 'briefing', 'zusatz', 'buchung_aendern', 'buchung_loeschen', 'rechnung_bezahlt', 'journal', 'fahrt', 'kontostand', 'lohnlauf'].includes(a.typ)) inhalt = schrittText(a) + (a.typ === 'auftrag_rechnung' ? '<br><small>Sie sehen die Rechnung danach und senden sie selbst.</small>' : '');
    if (a.typ === 'rechnung') inhalt = `An: <b>${esc(a.kunde)}</b><br>${(a.positionen || []).map((p) => `${esc(p.text)}: ${Number(p.menge).toLocaleString('de-CH')} × ${chf(p.preis)} = <b>${chf(Math.round(p.menge * p.preis))}</b>`).join('<br>')}<br><small>Sie sehen die Rechnung danach und senden sie selbst.</small>`;
    if (a.typ === 'erinnerung') inhalt = `<b>${esc(a.titel)}</b><br>${dk(a.datum)}${a.zeit ? ' um ' + esc(a.zeit) : ' (ganzer Tag)'}`;
    if (a.typ === 'mahnen') inhalt = 'Ich öffne die Rechnungen mit dem Mahn-Assistenten. Dort sehen Sie alle Überfälligen und bereiten Erinnerung oder Mahnung mit einem Klick vor.';
    if (a.typ === 'stelle') inhalt = `Beruf: <b>${esc(a.beruf)}</b>${a.pensum ? ', ' + esc(a.pensum) : ''}<br><small>Titel und Text werden ausgefüllt, Sie prüfen und speichern.</small>`;
    if (a.typ === 'einsatz') inhalt = `${esc(a.mitarbeiter || '')}${a.auftrag ? ' · ' + esc(a.auftrag) : ''}<br>${dk(a.datum)}${a.von ? ' ' + esc(a.von) + (a.bis ? '–' + esc(a.bis) : '') : ''}${a.adresse ? '<br>' + esc(a.adresse) : ''}`;
    if (a.typ === 'navigieren') inhalt = esc(a.text || '');
    return `<div class="ordi-aktion"><b>${TITEL[a.typ] || 'Auftrag'}</b><div style="margin:6px 0 8px;font-size:13.5px;line-height:1.5">${inhalt}</div><div class="ordi-chips" style="margin:0"><button data-ordi-ja>✓ Ja, ausführen</button><button data-ordi-nein>Abbrechen</button></div></div>`;
  }

  async function ausfuehren(a) {
    const sb = window.NASUVIA_SB;
    if (a.typ === 'plan') {
      const aus = [];
      for (const z of a.schritte || []) { const t = await ausfuehren(z); aus.push(t); if (/^Das hat nicht geklappt|^Ich finde/.test(t)) break; }
      return aus.join('\n');
    }
    const finde = async (tabelle, name) => {
      const { data } = await sb.from(tabelle).select('*').is('geloescht_am', null).limit(1000);
      const n = String(name || '').toLowerCase().trim();
      return (data || []).find((x) => x.name.toLowerCase() === n) || (data || []).find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase().split(' ')[0]));
    };
    if (a.typ === 'mitarbeiter') {
      if (!sb) return 'Mitarbeiter gibt es nach der Anmeldung.';
      const alt = await finde('ze_mitarbeiter', a.name);
      if (alt && alt.name.toLowerCase() === a.name.toLowerCase()) return `✓ ${alt.name} ist schon erfasst.`;
      const { data, error } = await sb.from('ze_mitarbeiter').insert({ name: a.name.slice(0, 120), stundenlohn_rappen: a.stundenlohn || 0, ansatz_rappen: a.ansatz || 0 }).select('name,token').single();
      if (error) return 'Das hat nicht geklappt: ' + error.message;
      const link = new URL('zeit/erfassen/?t=' + data.token, WURZEL).href;
      return `✓ ${data.name} ist erfasst. Persönlicher Handy-Link (per WhatsApp schicken): ${link}${a.stundenlohn ? '' : '\nTipp: Stundenlohn und Ansatz tragen Sie in der Zeiterfassung unter „Mitarbeiter“ nach.'}`;
    }
    if (a.typ === 'auftrag') {
      if (!sb) return 'Aufträge gibt es nach der Anmeldung.';
      const alt = await finde('ze_auftraege', a.name);
      if (alt && alt.name.toLowerCase() === a.name.toLowerCase()) return `✓ Auftrag „${alt.name}“ gibt es schon.`;
      const { error } = await sb.from('ze_auftraege').insert({ name: a.name.slice(0, 160), kunde: (a.kunde || '').slice(0, 160), adresse: (a.adresse || '').slice(0, 200) });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Auftrag „${a.name}“ erstellt${a.kunde ? ' für ' + a.kunde : ''}.`;
    }
    if (a.typ === 'zuweisen') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const [m, f] = await Promise.all([finde('ze_mitarbeiter', a.mitarbeiter), finde('ze_auftraege', a.auftrag)]);
      if (!m) return `Ich finde keine Mitarbeiterin und keinen Mitarbeiter „${a.mitarbeiter}“.`;
      if (!f) return `Ich finde keinen Auftrag „${a.auftrag}“.`;
      const zu = [...new Set([...(f.zugewiesen || []), m.id])];
      const { error } = await sb.from('ze_auftraege').update({ zugewiesen: zu }).eq('id', f.id);
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ „${f.name}“ ist ${m.name} zugeteilt. ${m.name} sieht den Auftrag jetzt auf dem Handy.`;
    }
    // Lizenz auch beim Ausführen prüfen (falls die Lizenz inzwischen anders ist)
    const fehlt = fehltFuer(a.typ); if (fehlt) return `${WAS[a.typ] || 'Das'} ist in Ihrer Lizenz nicht enthalten.`;
    if (['buchung', 'buchung_aendern', 'buchung_loeschen', 'rechnung_bezahlt', 'journal', 'fahrt', 'kontostand', 'lohnlauf'].includes(a.typ)) { const r = await bhAusfuehren(a); if (r) return r; }
    if (a.typ === 'zusatz') { if (window.OrdasioZusatz) window.OrdasioZusatz.erklaeren(a.modul); return 'Hier ist die Übersicht.'; }
    if (a.typ === 'briefing') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const { data: { user } } = await sb.auth.getUser();
      const z = { user_id: user.id, an: a.an !== false, rhythmus: a.rhythmus || 'woechentlich', tag: a.tag || 1, zeit: a.zeit || '07:30', geaendert: new Date().toISOString() };
      const { error } = await sb.from('br_einstellungen').upsert(z);
      return error ? 'Das hat nicht geklappt: ' + error.message : (z.an ? '✓ Briefing eingestellt.' : '✓ Briefing ausgeschaltet.');
    }
    if (a.typ === 'buchung') { try { sessionStorage.setItem('ordasio.buchung', JSON.stringify(a)); } catch {} location.href = WURZEL + '?bereich=buchhaltung'; return 'Ich öffne die Buchung …'; }
    if (a.typ === 'kunde') { try { sessionStorage.setItem('ordasio.kunde', JSON.stringify(a)); } catch {} location.href = WURZEL + 'rechnungen/'; return 'Ich erfasse den Kunden in den Rechnungen …'; }
    if (a.typ === 'offerte') { try { sessionStorage.setItem('ordasio.zeit.rechnung', JSON.stringify({ dokArt: 'offerte', positionen: a.positionen.map((p) => ({ text: p.text, menge: String(p.menge), preis: p.preis ? (p.preis / 100).toFixed(2) : '' })), kunde: a.kunde, quelle: 'Ordi' })); } catch {} location.href = WURZEL + 'rechnungen/'; return 'Ich öffne die Offerte …'; }
    if (a.typ === 'lager') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const ar = await finde('lg_artikel', a.artikel); if (!ar) return `Ich finde keinen Artikel „${a.artikel}“ im Lager. Erfassen Sie ihn zuerst im Lager.`;
      let auf = null; if (a.auftrag) { auf = await finde('ze_auftraege', a.auftrag); if (!auf) return `Ich finde keinen Auftrag „${a.auftrag}“.`; }
      const menge = Math.abs(Number(a.menge) || 0); if (!menge) return 'Bitte eine Menge angeben.';
      const { error } = await sb.from('lg_bewegungen').insert({ artikel_id: ar.id, art: a.art === 'eingang' ? 'eingang' : 'ausgang', menge: a.art === 'eingang' ? menge : -menge, auftrag_id: auf ? auf.id : null, notiz: 'Über Ordi' });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ ${menge} ${ar.einheit || ''} ${ar.name} ${a.art === 'eingang' ? 'eingebucht' : 'ausgebucht'}${auf ? ' auf ' + auf.name : ''}. Neuer Bestand: ${(Number(ar.bestand) || 0) + (a.art === 'eingang' ? menge : -menge)} ${ar.einheit || ''}.`;
    }
    if (a.typ === 'bereitstellen') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const fu = await finde('ze_mitarbeiter', a.fuer); if (!fu) return `Ich finde niemanden namens „${a.fuer}“ im Team.`;
      let la = null; if (a.an) { la = await finde('ze_mitarbeiter', a.an); if (!la) return `Ich finde niemanden namens „${a.an}“ im Team.`; }
      let auf = null; if (a.auftrag) { auf = await finde('ze_auftraege', a.auftrag); if (!auf) return `Ich finde keinen Auftrag „${a.auftrag}“.`; }
      const ar = await finde('lg_artikel', a.artikel);
      const menge = Math.abs(Number(a.menge) || 0); if (!menge) return 'Bitte eine Menge angeben.';
      const { error } = await sb.from('lg_anforderungen').insert({ artikel_id: ar ? ar.id : null, artikel_text: (ar ? ar.name : a.artikel).slice(0, 160), menge, einheit: (ar && ar.einheit) || a.einheit || null, fuer_id: fu.id, an_id: la ? la.id : null, auftrag_id: auf ? auf.id : null, bis: a.bis || null, von_name: 'Büro (Ordi)' });
      if (error) return 'Das hat nicht geklappt: ' + error.message;
      const lg = la ? la.name : 'Das Lager';
      return `✓ Angefordert: ${menge.toLocaleString('de-CH')} ${(ar && ar.einheit) || a.einheit || ''} ${ar ? ar.name : a.artikel} für ${fu.name}. ${lg} sieht es auf dem Handy${la && !(la.lager || la.rolle === 'lagerist') ? ' (Hinweis: ' + la.name + ' führt das Lager noch nicht, das können Sie unter Zeiterfassung › Mitarbeiter einschalten)' : ''}.${ar ? '' : ' Der Artikel ist nicht im Lager erfasst, darum wird kein Bestand abgebucht.'}`;
    }
    if (a.typ === 'termin') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const beginn = new Date(`${a.datum}T${a.zeit}:00`), ende = new Date(beginn.getTime() + (Number(a.dauer) || 60) * 60000);
      const { error } = await sb.from('tb_termine').insert({ name: String(a.name).slice(0, 120), beginn: beginn.toISOString(), ende: ende.toISOString(), status: 'bestaetigt', quelle: 'manuell', notiz: a.notiz || '' });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Termin mit ${a.name} am ${dk(a.datum)} um ${a.zeit} eingetragen.`;
    }
    if (a.typ === 'ferien' || a.typ === 'spesen') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const m = await finde('ze_mitarbeiter', a.mitarbeiter); if (!m) return `Ich finde niemanden namens „${a.mitarbeiter}“.`;
      const tab = a.typ === 'ferien' ? 'ab_antraege' : 'ze_spesen';
      const upd = a.typ === 'ferien' ? { status: a.entscheid, entschieden: new Date().toISOString() } : { status: a.entscheid };
      const { data, error } = await sb.from(tab).update(upd).eq('mitarbeiter_id', m.id).eq('status', 'offen').select('id');
      if (error) return 'Das hat nicht geklappt: ' + error.message;
      const n = (data || []).length;
      return n ? `✓ ${n} ${a.typ === 'ferien' ? (n === 1 ? 'Antrag' : 'Anträge') : 'Spesen'} von ${m.name} ${a.entscheid === 'abgelehnt' ? 'abgelehnt' : 'genehmigt'}. ${m.name} sieht es auf dem Handy.` : `Von ${m.name} ist nichts offen.`;
    }
    if (a.typ === 'mitteilung') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const { error } = await sb.from('ab_mitteilungen').insert({ mitarbeiter_id: null, titel: String(a.titel || a.text).slice(0, 120), text: a.text || null, wichtig: !!a.wichtig });
      return error ? 'Das hat nicht geklappt: ' + error.message : '✓ Mitteilung verschickt. Alle sehen sie auf dem Handy.';
    }
    if (a.typ === 'auftrag_rechnung') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const f = await finde('ze_auftraege', a.auftrag); if (!f) return `Ich finde keinen Auftrag „${a.auftrag}“.`;
      const [{ data: ein }, { data: ma }, { data: mat }] = await Promise.all([
        sb.from('ze_eintraege').select('id,mitarbeiter_id,datum,minuten,taetigkeit,km').eq('auftrag_id', f.id).eq('verrechnet', false).is('geloescht_am', null),
        sb.from('ze_mitarbeiter').select('id,name,ansatz_rappen'),
        sb.from('lg_bewegungen').select('id,menge,lg_artikel(name,nummer,verkauf_rappen,einheit)').eq('auftrag_id', f.id).eq('art', 'ausgang').eq('verrechnet', false)]);
      const pos = [], g = new Map();
      for (const e of ein || []) { const k = e.mitarbeiter_id + '|' + (e.taetigkeit || '').toLowerCase(); if (!g.has(k)) g.set(k, { m: (ma || []).find((x) => x.id === e.mitarbeiter_id) || {}, t: e.taetigkeit, min: 0 }); g.get(k).min += e.minuten; }
      for (const x of g.values()) pos.push({ text: `${x.t || 'Arbeit'} (${x.m.name || 'Mitarbeiter'})`, menge: Math.round(x.min / 6) / 10, preis: x.m.ansatz_rappen || 0 });
      const pa = new Map(); for (const b of mat || []) { const k = (b.lg_artikel || {}).name || 'Material'; const y = pa.get(k) || { a: b.lg_artikel || {}, menge: 0 }; y.menge += Math.abs(Number(b.menge) || 0); pa.set(k, y); }
      for (const y of pa.values()) pos.push({ text: (y.a.name || 'Material') + (y.a.nummer ? ` (${y.a.nummer})` : ''), menge: Math.round(y.menge * 100) / 100, preis: y.a.verkauf_rappen || 0 });
      const km = (ein || []).reduce((s, e) => s + Number(e.km || 0), 0); if (km) pos.push({ text: `Fahrspesen ${km} km`, menge: km, preis: 70 });
      if (!pos.length) pos.push({ text: 'Arbeit gemäss Auftrag ' + f.name, menge: 1, preis: f.pauschal_rappen || 0 });
      if ((ein || []).length) await sb.from('ze_eintraege').update({ verrechnet: true }).in('id', ein.map((e) => e.id));
      if ((mat || []).length) await sb.from('lg_bewegungen').update({ verrechnet: true }).in('id', mat.map((b) => b.id));
      return ausfuehren({ typ: 'rechnung', kunde: f.kunde || '', projekt: f.name, positionen: pos });
    }
    if (a.typ === 'rechnung') {
      if (!a.kunde && a.auftrag && sb) { const f = await finde('ze_auftraege', a.auftrag); if (f) { a.kunde = f.kunde || ''; a.projekt = f.name; } }
      try { sessionStorage.setItem('ordasio.zeit.rechnung', JSON.stringify({ positionen: a.positionen.map((p) => ({ text: p.text, menge: String(p.menge), preis: p.preis ? (p.preis / 100).toFixed(2) : '' })), kunde: a.kunde, projekt: a.projekt || '', quelle: 'Ordi' })); } catch {}
      location.href = WURZEL + 'rechnungen/'; return 'Ich öffne die Rechnung …';
    }
    if (a.typ === 'erinnerung') {
      if (!sb) return 'Erinnerungen gibt es nach der Anmeldung.';
      const ganztag = !a.zeit, wann = new Date(`${a.datum}T${a.zeit || '08:00'}:00`).toISOString();
      const { error } = await sb.from('erinnerungen').insert({ titel: a.titel.slice(0, 200), wann, ganztag, wiederholung: 'nie', vorher_min: ganztag ? 0 : 15, bereich: location.pathname });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Eingetragen: „${a.titel}“ am ${dk(a.datum)}${a.zeit ? ' um ' + a.zeit : ''}. Mit verbundenem Kalender meldet sich auch Ihr Handy.`;
    }
    if (a.typ === 'mahnen') { location.href = WURZEL + 'rechnungen/#mahnBox'; return 'Ich öffne den Mahn-Assistenten …'; }
    if (a.typ === 'stelle') { try { sessionStorage.setItem('ordasio.stelle', JSON.stringify({ beruf: a.beruf, pensum: a.pensum || '' })); } catch {} location.href = WURZEL + 'ablage/?tab=bewerbungen'; return 'Ich öffne die offenen Stellen …'; }
    if (a.typ === 'einsatz') {
      if (!sb) return 'Einsätze gibt es nach der Anmeldung.';
      const [{ data: ma }, { data: af }] = await Promise.all([sb.from('ze_mitarbeiter').select('id,name').is('geloescht_am', null), sb.from('ze_auftraege').select('id,name').is('geloescht_am', null)]);
      const finde = (l, n) => (l || []).find((x) => n && x.name.toLowerCase().includes(String(n).toLowerCase()));
      const m = finde(ma, a.mitarbeiter); if (!m) return `Ich finde keine Mitarbeiterin und keinen Mitarbeiter „${a.mitarbeiter || ''}“.`;
      const f = finde(af, a.auftrag);
      const { error } = await sb.from('ze_einsaetze').insert({ mitarbeiter_id: m.id, auftrag_id: f ? f.id : null, datum: a.datum, von: a.von || null, bis: a.bis || null, adresse: a.adresse || '', info: a.info || '' });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Einsatz für ${m.name} am ${dk(a.datum)} geplant${f ? ' (' + f.name + ')' : ''}.`;
    }
    if (a.typ === 'navigieren' && a.ziel) { location.href = new URL(a.ziel, WURZEL).href; return 'Ich führe Sie hin …'; }
    return 'Das kann ich noch nicht.';
  }
  window.OrdiAktionen = { erkennen, karte, ausfuehren, kontext, pruefen, vorbereiten, belegMerken, kategorien: async () => kategorien(await einst()) };
})();
