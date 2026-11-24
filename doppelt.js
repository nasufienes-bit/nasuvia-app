// Doppelte Buchhaltung für Ordasio (GmbH, AG und Einzelfirmen, die es zuschalten).
// Grundlage ist der Schweizer KMU-Kontenrahmen. Die einfachen Buchungen (Einnahme, Ausgabe, Rechnung, Lohn, Fahrt)
// werden automatisch in Soll und Haben übersetzt; dazu kommen manuelle Buchungen aus dem Journal (Eröffnung,
// Abschreibungen, Privat, MWST-Verbuchung usw.). Daraus entstehen Salden, Kontoblätter, Bilanz und Erfolgsrechnung nach OR.
// Beträge immer in Rappen (ganze Zahlen). Wird von der Buchhaltung (app.js) und vom Treuhänder-Zugang benutzt.
(() => {
  const K = (nr, name, art) => ({ nr, name, art });

  /* ---------- Kontenplan ---------- */
  const BASIS = [
    K('1000', 'Kasse', 'aktiv'), K('1020', 'Bank', 'aktiv'), K('1021', 'Bank 2 (Sparkonto)', 'aktiv'), K('1060', 'Wertschriften', 'aktiv'),
    K('1100', 'Forderungen aus Lieferungen und Leistungen (Debitoren)', 'aktiv'), K('1109', 'Delkredere', 'aktiv'),
    K('1140', 'Vorschüsse und kurzfristige Darlehen', 'aktiv'), K('1170', 'Vorsteuer MWST', 'aktiv'), K('1176', 'Verrechnungssteuer (Guthaben)', 'aktiv'),
    K('1190', 'Übrige kurzfristige Forderungen', 'aktiv'), K('1200', 'Handelswaren', 'aktiv'), K('1210', 'Rohstoffe und Material', 'aktiv'),
    K('1300', 'Aktive Rechnungsabgrenzung', 'aktiv'), K('1440', 'Langfristige Darlehen', 'aktiv'), K('1480', 'Beteiligungen', 'aktiv'),
    K('1500', 'Maschinen und Apparate', 'aktiv'), K('1510', 'Mobiliar und Einrichtungen', 'aktiv'), K('1520', 'Büromaschinen und Informatik', 'aktiv'),
    K('1530', 'Fahrzeuge', 'aktiv'), K('1540', 'Werkzeuge und Geräte', 'aktiv'), K('1600', 'Geschäftsliegenschaften', 'aktiv'), K('1700', 'Patente, Marken, Software', 'aktiv'),
    K('2000', 'Verbindlichkeiten aus Lieferungen und Leistungen (Kreditoren)', 'passiv'), K('2030', 'Erhaltene Anzahlungen', 'passiv'),
    K('2100', 'Bankverbindlichkeiten (kurzfristig)', 'passiv'), K('2200', 'Geschuldete MWST', 'passiv'), K('2206', 'Verrechnungssteuer (geschuldet)', 'passiv'),
    K('2210', 'Übrige kurzfristige Verbindlichkeiten', 'passiv'), K('2270', 'Sozialversicherungen und Vorsorge', 'passiv'),
    K('2300', 'Passive Rechnungsabgrenzung', 'passiv'), K('2330', 'Kurzfristige Rückstellungen', 'passiv'),
    K('2400', 'Bankdarlehen (langfristig)', 'passiv'), K('2450', 'Darlehen', 'passiv'), K('2500', 'Übrige langfristige Verbindlichkeiten', 'passiv'),
    K('2600', 'Rückstellungen (langfristig)', 'passiv'),
  ];
  const EIGENKAPITAL = {
    einzel: [K('2800', 'Eigenkapital', 'passiv'), K('2850', 'Privat', 'passiv'), K('2891', 'Jahresgewinn oder Jahresverlust', 'passiv')],
    gmbh: [K('2261', 'Beschlossene Gewinnausschüttungen', 'passiv'), K('2800', 'Stammkapital', 'passiv'), K('2900', 'Gesetzliche Kapitalreserve', 'passiv'),
      K('2950', 'Gesetzliche Gewinnreserve', 'passiv'), K('2960', 'Freiwillige Gewinnreserven', 'passiv'), K('2970', 'Gewinnvortrag oder Verlustvortrag', 'passiv'),
      K('2979', 'Jahresgewinn oder Jahresverlust', 'passiv')],
    klg: [K('2800', 'Kapital der Gesellschafter', 'passiv'), K('2850', 'Privatkonten der Gesellschafter', 'passiv'), K('2891', 'Jahresgewinn oder Jahresverlust', 'passiv')],
    genossenschaft: [K('2261', 'Beschlossene Gewinnausschüttungen', 'passiv'), K('2800', 'Genossenschaftskapital', 'passiv'), K('2900', 'Gesetzliche Kapitalreserve', 'passiv'),
      K('2950', 'Gesetzliche Gewinnreserve', 'passiv'), K('2960', 'Freiwillige Gewinnreserven', 'passiv'), K('2970', 'Gewinnvortrag oder Verlustvortrag', 'passiv'),
      K('2979', 'Jahresgewinn oder Jahresverlust', 'passiv')],
    verein: [K('2800', 'Vereinsvermögen (Organisationskapital)', 'passiv'), K('2960', 'Fonds und Reserven', 'passiv'), K('2970', 'Ergebnisvortrag', 'passiv'),
      K('2979', 'Jahresergebnis', 'passiv')],
    ag: [K('2261', 'Beschlossene Dividenden', 'passiv'), K('2800', 'Aktienkapital', 'passiv'), K('2900', 'Gesetzliche Kapitalreserve', 'passiv'),
      K('2950', 'Gesetzliche Gewinnreserve', 'passiv'), K('2960', 'Freiwillige Gewinnreserven', 'passiv'), K('2970', 'Gewinnvortrag oder Verlustvortrag', 'passiv'),
      K('2979', 'Jahresgewinn oder Jahresverlust', 'passiv')],
  };
  const ERFOLG = [
    K('3000', 'Produktionserlöse', 'ertrag'), K('3200', 'Handelserlöse', 'ertrag'), K('3400', 'Dienstleistungserlöse', 'ertrag'), K('3600', 'Übrige Erlöse', 'ertrag'),
    K('3800', 'Erlösminderungen (Rabatte, Skonti)', 'ertrag'), K('3805', 'Verluste aus Forderungen', 'ertrag'),
    K('4000', 'Materialaufwand', 'aufwand'), K('4200', 'Handelswarenaufwand', 'aufwand'), K('4400', 'Fremdarbeiten und bezogene Dienstleistungen', 'aufwand'),
    K('4900', 'Aufwandminderungen (Skonti, Rabatte)', 'aufwand'),
    K('5000', 'Lohnaufwand', 'aufwand'), K('5700', 'Sozialversicherungsaufwand', 'aufwand'), K('5800', 'Übriger Personalaufwand', 'aufwand'),
    K('5810', 'Aus- und Weiterbildung', 'aufwand'), K('5820', 'Spesen', 'aufwand'),
    K('6000', 'Raumaufwand (Miete)', 'aufwand'), K('6100', 'Unterhalt, Reparaturen, Kleingeräte', 'aufwand'), K('6200', 'Fahrzeugaufwand', 'aufwand'),
    K('6300', 'Versicherungen', 'aufwand'), K('6360', 'Abgaben, Gebühren, Bewilligungen', 'aufwand'), K('6400', 'Energie und Entsorgung', 'aufwand'),
    K('6500', 'Verwaltungsaufwand', 'aufwand'), K('6510', 'Telefon und Internet', 'aufwand'), K('6570', 'Informatik und Software', 'aufwand'),
    K('6600', 'Werbung', 'aufwand'), K('6700', 'Sonstiger betrieblicher Aufwand', 'aufwand'), K('6800', 'Abschreibungen', 'aufwand'),
    K('6900', 'Finanzaufwand (Zinsen)', 'aufwand'), K('6940', 'Bankspesen', 'aufwand'), K('6950', 'Finanzertrag', 'ertrag'),
    K('8000', 'Betriebsfremder Aufwand', 'aufwand'), K('8100', 'Betriebsfremder Ertrag', 'ertrag'),
    K('8500', 'Ausserordentlicher Aufwand', 'aufwand'), K('8510', 'Ausserordentlicher Ertrag', 'ertrag'),
  ];
  const STEUERN = K('8900', 'Direkte Steuern (Gewinn- und Kapitalsteuern)', 'aufwand');
  const ABSCHLUSS = [K('9100', 'Eröffnungsbilanz', 'abschluss')];

  const artNachNummer = (nr) => {
    const k = String(nr)[0];
    return k === '1' ? 'aktiv' : k === '2' ? 'passiv' : k === '3' ? 'ertrag' : k === '9' ? 'abschluss' : 'aufwand';
  };
  // eigene: [{ nr, name, art }] neue oder umbenannte Konten; versteckt: Nummern, die im Plan nicht erscheinen sollen
  // Personenunternehmen (Einzelfirma, Kollektivgesellschaft): Privatkonto, Gewinn ins Eigenkapital, keine Gewinnsteuer
  const person = (rf) => !EIGENKAPITAL[rf] || rf === 'einzel' || rf === 'klg';
  function kontenplan(rechtsform = 'einzel', eigene = []) {
    const rf = EIGENKAPITAL[rechtsform] ? rechtsform : 'einzel';
    const map = new Map();
    for (const k of [...BASIS, ...EIGENKAPITAL[rf], ...ERFOLG, ...(person(rf) ? [] : [STEUERN]), ...ABSCHLUSS]) map.set(k.nr, { ...k, standard: true });
    for (const e of eigene || []) {
      if (!e || !/^\d{4}$/.test(String(e.nr || ''))) continue;
      const alt = map.get(e.nr);
      map.set(e.nr, { ...(alt || { art: e.art || artNachNummer(e.nr) }), ...e, art: (alt && alt.art) || e.art || artNachNummer(e.nr), standard: !!alt });
    }
    return [...map.values()].sort((a, b) => a.nr.localeCompare(b.nr));
  }
  const istBilanzkonto = (nr) => /^[12]/.test(String(nr));
  const istErfolgskonto = (nr) => /^[3-8]/.test(String(nr));

  /* ---------- Kategorien und Zahlungsarten ---------- */
  const STD_KONTO = {
    material: '4000', fremd: '4400', werkzeug: '6100', anschaffung: '1500', fahrzeug: '6200', telefon: '6510', software: '6570', buero: '6000',
    werbung: '6600', spesen: '5820', weiterbildung: '5810', versicherung: '6300', bank: '6940', gebuehren: '6360', loehne: '5000', sozial: '5700',
    fahrten: '6200', uebrig: '6700', steuern: '8900', energie: '6400',
    dienstleistung: '3400', materialverkauf: '3200', 'uebrig-ein': '3600',
  };
  const STD_ZAHLUNG = { Bank: '1020', Karte: '1020', TWINT: '1020', Bar: '1000' };
  function kategorieKonto(einst, typ, kategorie) {
    const z = (einst && einst.kontoZuordnung) || {};
    return z[kategorie] || STD_KONTO[kategorie] || (typeof window !== 'undefined' && window.Branchen && window.Branchen.konto(kategorie)) || (typ === 'einnahme' ? '3600' : '6700');
  }
  const zahlungKonto = (einst, zahlung) => (((einst && einst.zahlungKonten) || {})[zahlung]) || STD_ZAHLUNG[zahlung] || '1020';

  /* ---------- Journal: Soll und Haben ---------- */
  const zeile = (soll, haben, betrag) => (betrag > 0 && soll && haben && soll !== haben ? { soll, haben, betrag: Math.round(betrag) } : null);
  // Aus den einfachen Buchungen und den manuellen Journal-Einträgen das ganze Journal bilden
  function journalAus({ buchungen = [], journal = [], einst = {}, rechtsform = 'einzel' }) {
    const aus = [];
    const dazu = (e) => { e.zeilen = e.zeilen.filter(Boolean); if (e.zeilen.length && e.datum) aus.push(e); };
    for (const b of buchungen) {
      if (!b || b.geloescht || !b.datum || !(b.betragRappen > 0)) continue;
      const B = b.betragRappen, M = Math.max(0, b.mwstRappen || 0), N = B - M;
      const geld = zahlungKonto(einst, b.zahlung);
      const konto = kategorieKonto(einst, b.typ, b.kategorie);
      const text = b.text || b.partner || '';
      const beleg = b.rechnungNr ? 'R ' + b.rechnungNr : '';
      if (b.typ === 'einnahme') {
        if (b.quelle === 'rechnung') {
          dazu({ id: 'b:' + b.id, ref: b.id, art: 'auto', datum: b.datum, beleg, text: text || 'Rechnung', zeilen: [zeile('1100', konto, N), zeile('1100', '2200', M)] });
          if (b.bezahlt) dazu({ id: 'b:' + b.id + ':z', ref: b.id, art: 'auto', datum: b.bezahltAm || b.datum, beleg, text: 'Zahlung ' + (text || 'Rechnung'), zeilen: [zeile(geld, '1100', B)] });
        } else {
          dazu({ id: 'b:' + b.id, ref: b.id, art: 'auto', datum: b.datum, beleg, text, zeilen: [zeile(geld, konto, N), zeile(geld, '2200', M)] });
        }
        continue;
      }
      // Ausgaben
      if (b.quelle === 'lohn' && b.kategorie === 'loehne' && b.anAbzuege > 0) {
        // Ausbezahlt wird der Nettolohn, die Abzüge schuldet die Firma den Sozialversicherungen
        dazu({ id: 'b:' + b.id, ref: b.id, art: 'auto', datum: b.datum, beleg, text, zeilen: [zeile(konto, geld, B - b.anAbzuege), zeile(konto, '2270', b.anAbzuege)] });
        continue;
      }
      if (b.quelle === 'lohn' && b.kategorie === 'sozial') {
        dazu({ id: 'b:' + b.id, ref: b.id, art: 'auto', datum: b.datum, beleg, text, zeilen: [zeile(konto, '2270', B)] });
        continue;
      }
      const gegen = b.kreditor ? '2000' : b.quelle === 'fahrt' ? (person(rechtsform) ? '2850' : '2210') : geld;
      dazu({ id: 'b:' + b.id, ref: b.id, art: 'auto', datum: b.datum, beleg, text, zeilen: [zeile(konto, gegen, N), zeile('1170', gegen, M)] });
      if (b.kreditor && b.bezahlt) dazu({ id: 'b:' + b.id + ':z', ref: b.id, art: 'auto', datum: b.bezahltAm || b.datum, beleg, text: 'Zahlung ' + text, zeilen: [zeile('2000', geld, B)] });
    }
    // Bargeld zwischen Bank und Kasse
    for (const x of ((einst.kasse || {}).bewegungen) || []) {
      if (!x || !(x.betrag > 0)) continue;
      dazu({ id: 'k:' + x.id, art: 'kasse', datum: x.datum, beleg: '', text: x.art === 'bezug' ? 'Bargeld vom Konto abgehoben' : 'Bargeld aufs Konto einbezahlt',
        zeilen: [x.art === 'bezug' ? zeile('1000', zahlungKonto(einst, 'Bank'), x.betrag) : zeile(zahlungKonto(einst, 'Bank'), '1000', x.betrag)] });
    }
    // Manuelle Buchungen
    for (const j of journal) {
      if (!j || j.geloescht) continue;
      dazu({ id: j.id, art: j.art || 'manuell', datum: j.datum, beleg: j.beleg || '', text: j.text || '', zeilen: (j.zeilen || []).map((z) => zeile(z.soll, z.haben, z.betrag)) });
    }
    return aus.sort((a, b) => a.datum.localeCompare(b.datum) || (a.art === 'eroeffnung' ? -1 : b.art === 'eroeffnung' ? 1 : 0) || a.id.localeCompare(b.id));
  }

  /* ---------- Salden ---------- */
  function bewegungen(eintraege, von, bis) {
    const m = new Map();
    const add = (nr, s, h) => { const x = m.get(nr) || { soll: 0, haben: 0 }; x.soll += s; x.haben += h; m.set(nr, x); };
    for (const e of eintraege) {
      if ((von && e.datum < von) || (bis && e.datum > bis)) continue;
      for (const z of e.zeilen) { add(z.soll, z.betrag, 0); add(z.haben, 0, z.betrag); }
    }
    return m;
  }
  // Saldo in der „natürlichen“ Richtung des Kontos: Aktiven und Aufwand Soll minus Haben, Passiven und Ertrag umgekehrt
  const saldoVon = (art, x) => (!x ? 0 : (art === 'passiv' || art === 'ertrag') ? x.haben - x.soll : x.soll - x.haben);
  const artVon = (plan, nr) => ((plan.find((k) => k.nr === nr) || {}).art) || artNachNummer(nr);
  const nameVon = (plan, nr) => ((plan.find((k) => k.nr === nr) || {}).name) || 'Konto ' + nr;

  /* ---------- Bilanz und Erfolgsrechnung nach OR ---------- */
  const AKTIVEN = [
    { titel: 'Umlaufvermögen', teile: [['Flüssige Mittel', 1000, 1099], ['Forderungen aus Lieferungen und Leistungen', 1100, 1139], ['Übrige kurzfristige Forderungen', 1140, 1199], ['Vorräte', 1200, 1299], ['Aktive Rechnungsabgrenzungen', 1300, 1399]] },
    { titel: 'Anlagevermögen', teile: [['Finanzanlagen und Beteiligungen', 1400, 1499], ['Mobile Sachanlagen', 1500, 1599], ['Immobile Sachanlagen', 1600, 1699], ['Immaterielle Werte', 1700, 1799], ['Nicht einbezahltes Kapital', 1800, 1999]] },
  ];
  const PASSIVEN = [
    { titel: 'Kurzfristiges Fremdkapital', teile: [['Verbindlichkeiten aus Lieferungen und Leistungen', 2000, 2099], ['Kurzfristige verzinsliche Verbindlichkeiten', 2100, 2199], ['Übrige kurzfristige Verbindlichkeiten', 2200, 2299], ['Passive Rechnungsabgrenzungen und kurzfristige Rückstellungen', 2300, 2399]] },
    { titel: 'Langfristiges Fremdkapital', teile: [['Langfristige verzinsliche Verbindlichkeiten', 2400, 2499], ['Übrige langfristige Verbindlichkeiten', 2500, 2599], ['Rückstellungen', 2600, 2799]] },
    { titel: 'Eigenkapital', teile: [['Eigenkapital', 2800, 2999]] },
  ];
  const ERFOLGSRECHNUNG = [
    { titel: 'Nettoerlöse aus Lieferungen und Leistungen', von: 3000, bis: 3999 },
    { titel: 'Material- und Warenaufwand', von: 4000, bis: 4999 },
    { zwischen: 'Bruttogewinn' },
    { titel: 'Personalaufwand', von: 5000, bis: 5999 },
    { titel: 'Übriger betrieblicher Aufwand', von: 6000, bis: 6799 },
    { zwischen: 'Betriebsergebnis vor Abschreibungen (EBITDA)' },
    { titel: 'Abschreibungen', von: 6800, bis: 6899 },
    { zwischen: 'Betriebsergebnis vor Zinsen (EBIT)' },
    { titel: 'Finanzaufwand und Finanzertrag', von: 6900, bis: 6999 },
    { titel: 'Betrieblicher Nebenerfolg', von: 7000, bis: 7999 },
    { titel: 'Betriebsfremder Erfolg', von: 8000, bis: 8499 },
    { titel: 'Ausserordentlicher Erfolg', von: 8500, bis: 8899 },
    { zwischen: 'Ergebnis vor Steuern', nurFirma: true },
    { titel: 'Direkte Steuern', von: 8900, bis: 8999 },
  ];
  const inBereich = (nr, a, b) => Number(nr) >= a && Number(nr) <= b;

  // jahr: '2026'; bis: Stichtag (sonst 31.12.)
  function bericht({ plan, eintraege, jahr, bis = '', rechtsform = 'einzel' }) {
    const stichtag = bis || jahr + '-12-31';
    const anfang = jahr + '-01-01';
    const bil = bewegungen(eintraege, '', stichtag);
    const er = bewegungen(eintraege, anfang, stichtag);
    const vor = bewegungen(eintraege, '', jahr - 1 + '-12-31');
    const alleNr = new Set([...plan.map((k) => k.nr), ...bil.keys()]);

    // Ergebnis aus den Vorjahren (noch nicht verbucht) und Privat der Vorjahre
    let vorErgebnis = 0;
    for (const [nr, x] of vor) if (istErfolgskonto(nr)) vorErgebnis += artVon(plan, nr) === 'ertrag' ? saldoVon('ertrag', x) : -saldoVon('aufwand', x);
    const salden = new Map();
    for (const nr of alleNr) if (istBilanzkonto(nr)) salden.set(nr, saldoVon(artVon(plan, nr), bil.get(nr)));
    if (person(rechtsform)) {
      const privatVor = saldoVon('passiv', vor.get('2850'));
      salden.set('2850', (salden.get('2850') || 0) - privatVor);
      salden.set('2800', (salden.get('2800') || 0) + privatVor + vorErgebnis);
    } else {
      salden.set('2970', (salden.get('2970') || 0) + vorErgebnis);
    }

    // Erfolgsrechnung
    const erKonten = [...alleNr].filter(istErfolgskonto).sort();
    const erWert = (nr) => { const art = artVon(plan, nr); const s = saldoVon(art, er.get(nr)); return art === 'ertrag' ? s : -s; };
    const erfolg = [];
    let laufend = 0;
    for (const g of ERFOLGSRECHNUNG) {
      if (g.zwischen) { if (g.nurFirma && person(rechtsform)) continue; erfolg.push({ zwischen: g.zwischen, betrag: laufend }); continue; }
      const konten = erKonten.filter((nr) => inBereich(nr, g.von, g.bis)).map((nr) => ({ nr, name: nameVon(plan, nr), betrag: erWert(nr) })).filter((k) => k.betrag);
      const summe = konten.reduce((a, k) => a + k.betrag, 0);
      laufend += summe;
      if (konten.length) erfolg.push({ titel: g.titel, konten, summe });
    }
    const gewinn = laufend;

    // Bilanz
    const gewinnKonto = person(rechtsform) ? '2891' : '2979';
    salden.set(gewinnKonto, (salden.get(gewinnKonto) || 0) + gewinn);
    const seite = (gruppen) => gruppen.map((g) => {
      const teile = g.teile.map(([titel, a, b]) => {
        const konten = [...salden.keys()].filter((nr) => inBereich(nr, a, b)).sort().map((nr) => ({ nr, name: nameVon(plan, nr), betrag: salden.get(nr) })).filter((k) => k.betrag);
        return { titel, konten, summe: konten.reduce((s, k) => s + k.betrag, 0) };
      }).filter((t) => t.konten.length);
      return { titel: g.titel, teile, summe: teile.reduce((s, t) => s + t.summe, 0) };
    }).filter((g) => g.teile.length);
    const aktiven = seite(AKTIVEN), passiven = seite(PASSIVEN);
    const summeAktiven = aktiven.reduce((s, g) => s + g.summe, 0);
    const summePassiven = passiven.reduce((s, g) => s + g.summe, 0);
    const eroeffnungRest = saldoVon('aktiv', bil.get('9100'));
    return { stichtag, anfang, aktiven, passiven, summeAktiven, summePassiven, differenz: summeAktiven - summePassiven, eroeffnungRest, erfolg, gewinn, vorErgebnis };
  }

  // Saldenliste: Bilanzkonten bis zum Stichtag, Erfolgskonten im Jahr
  function saldenliste({ plan, eintraege, jahr, bis = '' }) {
    const stichtag = bis || jahr + '-12-31';
    const bil = bewegungen(eintraege, '', stichtag), er = bewegungen(eintraege, jahr + '-01-01', stichtag);
    const nummern = [...new Set([...plan.map((k) => k.nr), ...bil.keys()])].sort();
    return nummern.map((nr) => {
      const x = (istBilanzkonto(nr) || nr.startsWith('9') ? bil : er).get(nr) || { soll: 0, haben: 0 };
      const art = artVon(plan, nr);
      return { nr, name: nameVon(plan, nr), art, soll: x.soll, haben: x.haben, saldo: saldoVon(art, x) };
    });
  }

  // Kontoblatt: alle Bewegungen eines Kontos mit laufendem Saldo
  function kontoblatt({ plan, eintraege, nr, jahr, bis = '' }) {
    const art = artVon(plan, nr);
    const anfang = jahr + '-01-01', stichtag = bis || jahr + '-12-31';
    let saldo = istBilanzkonto(nr) ? saldoVon(art, bewegungen(eintraege, '', jahr - 1 + '-12-31').get(nr)) : 0;
    const start = saldo;
    const zeilen = [];
    for (const e of eintraege) {
      if (e.datum < anfang || e.datum > stichtag) continue;
      for (const z of e.zeilen) {
        if (z.soll !== nr && z.haben !== nr) continue;
        const soll = z.soll === nr ? z.betrag : 0, haben = z.haben === nr ? z.betrag : 0;
        saldo += (art === 'passiv' || art === 'ertrag') ? haben - soll : soll - haben;
        zeilen.push({ id: e.id, ref: e.ref, art: e.art, datum: e.datum, beleg: e.beleg, text: e.text, gegen: z.soll === nr ? z.haben : z.soll, soll, haben, saldo });
      }
    }
    return { nr, name: nameVon(plan, nr), art, anfang: start, zeilen, ende: saldo };
  }

  // Journal als CSV (eine Zeile pro Soll/Haben-Paar), lesbar für Excel und übliche Buchhaltungsprogramme
  function journalCsv(eintraege, plan, von = '', bis = '') {
    const q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const zeilen = [['Datum', 'Beleg', 'Text', 'Soll', 'Soll-Konto', 'Haben', 'Haben-Konto', 'Betrag'].map(q).join(';')];
    for (const e of eintraege) {
      if ((von && e.datum < von) || (bis && e.datum > bis)) continue;
      for (const z of e.zeilen) zeilen.push([e.datum, e.beleg, e.text, z.soll, nameVon(plan, z.soll), z.haben, nameVon(plan, z.haben), (z.betrag / 100).toFixed(2)].map(q).join(';'));
    }
    return '﻿' + zeilen.join('\r\n');
  }

  // Prüft eine manuelle Buchung; gibt Fehlertext oder ''
  function pruefen(eintrag, plan) {
    if (!eintrag.datum) return 'Bitte ein Datum angeben.';
    const z = (eintrag.zeilen || []).filter((x) => x && (x.soll || x.haben || x.betrag));
    if (!z.length) return 'Bitte mindestens eine Zeile mit Soll, Haben und Betrag erfassen.';
    const gibt = new Set(plan.map((k) => k.nr));
    for (const x of z) {
      if (!gibt.has(x.soll) || !gibt.has(x.haben)) return `Konto ${!gibt.has(x.soll) ? x.soll || '(leer)' : x.haben || '(leer)'} gibt es im Kontenplan nicht.`;
      if (x.soll === x.haben) return 'Soll und Haben dürfen nicht dasselbe Konto sein.';
      if (!(x.betrag > 0)) return 'Jede Zeile braucht einen Betrag grösser als 0.';
    }
    return '';
  }

  window.Doppelt = { kontenplan, person, istBilanzkonto, istErfolgskonto, artNachNummer, STD_KONTO, STD_ZAHLUNG, kategorieKonto, zahlungKonto,
    journalAus, bewegungen, saldoVon, bericht, saldenliste, kontoblatt, journalCsv, pruefen, nameVon };
})();
