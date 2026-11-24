// Branchen: passende Bereiche, Ausgaben-Kategorien und Beispiele für Rechnungen.
// Eine Quelle für Anmeldung, Paketempfehlung, Startseite und Buchhaltung.
// ziele: Bereiche auf der Startseite (ids wie in start/index.html), mitarbeiter: typischerweise mit Personal
// kat: zusätzliche Ausgaben-Kategorien { id, name, ziffer (MWST 400/405), satz }
// leistungen: Beispiele für Rechnungspositionen
(() => {
  const B = [
    { id: 'handwerk', name: 'Handwerk und Bau', icon: '🔨', text: 'Maler, Schreiner, Elektriker, Sanitär, Gipser',
      ziele: ['rechnungen', 'buchhaltung', 'zeit', 'lager'], mitarbeiter: true,
      kat: [{ id: 'b-mietgeraete', name: 'Mietgeräte und Gerüste', ziffer: 400, satz: 8.1 }, { id: 'b-entsorgung', name: 'Entsorgung', ziffer: 400, satz: 8.1 }, { id: 'b-arbeitskleider', name: 'Arbeitskleider und Schutz', ziffer: 405, satz: 8.1 }],
      leistungen: ['Malerarbeiten Wohnung 3.5 Zimmer', 'Arbeitsstunden', 'Material gemäss Rapport', 'Anfahrt'] },
    { id: 'garten', name: 'Garten und Reinigung', icon: '🌿', text: 'Gartenpflege, Hauswartung, Reinigung',
      ziele: ['rechnungen', 'buchhaltung', 'zeit'], mitarbeiter: true,
      kat: [{ id: 'b-pflanzen', name: 'Pflanzen, Erde, Dünger', ziffer: 400, satz: 2.6 }, { id: 'b-reinigungsmittel', name: 'Reinigungsmittel', ziffer: 400, satz: 8.1 }, { id: 'b-entsorgung', name: 'Entsorgung und Grüngut', ziffer: 400, satz: 8.1 }],
      leistungen: ['Gartenpflege Mai', 'Rasen mähen und Hecke schneiden', 'Unterhaltsreinigung Treppenhaus', 'Entsorgung Grüngut'] },
    { id: 'beauty', name: 'Coiffeur und Kosmetik', icon: '✂️', text: 'Coiffeur, Kosmetik, Nails, Massage',
      ziele: ['termine', 'rechnungen', 'buchhaltung', 'lager'], mitarbeiter: false,
      kat: [{ id: 'b-produkte', name: 'Produkte für den Verkauf', ziffer: 400, satz: 8.1 }, { id: 'b-verbrauch', name: 'Verbrauchsmaterial (Farbe, Pflege)', ziffer: 400, satz: 8.1 }, { id: 'b-waesche', name: 'Wäsche und Tücher', ziffer: 405, satz: 8.1 }],
      leistungen: ['Damenhaarschnitt', 'Färben', 'Gesichtsbehandlung 60 Min.', 'Pflegeprodukt'] },
    { id: 'gesundheit', name: 'Therapie und Gesundheit', icon: '🩺', text: 'Physio, Psychologie, Ernährung, Coaching',
      ziele: ['termine', 'rechnungen', 'buchhaltung'], mitarbeiter: false,
      kat: [{ id: 'b-praxis', name: 'Praxismaterial', ziffer: 400, satz: 8.1 }, { id: 'b-supervision', name: 'Supervision und Fachverbände', ziffer: 405, satz: 0 }],
      leistungen: ['Sitzung 50 Minuten', 'Erstgespräch', 'Bericht'] },
    { id: 'beratung', name: 'Beratung und Büro', icon: '💼', text: 'Beratung, Treuhand, Übersetzung, IT',
      ziele: ['rechnungen', 'buchhaltung', 'termine'], mitarbeiter: false,
      kat: [{ id: 'b-fachliteratur', name: 'Fachliteratur und Lizenzen', ziffer: 405, satz: 2.6 }, { id: 'b-coworking', name: 'Coworking', ziffer: 405, satz: 8.1 }],
      leistungen: ['Beratung gemäss Stundenrapport', 'Workshop halber Tag', 'Pauschale Projekt'] },
    { id: 'kreativ', name: 'Design, Foto, Medien', icon: '🎨', text: 'Grafik, Fotografie, Video, Texte, Web',
      ziele: ['rechnungen', 'buchhaltung', 'termine'], mitarbeiter: false,
      kat: [{ id: 'b-ausruestung', name: 'Kamera und Ausrüstung', ziffer: 405, satz: 8.1 }, { id: 'b-bildrechte', name: 'Bildrechte, Schriften, Vorlagen', ziffer: 405, satz: 8.1 }, { id: 'b-druck', name: 'Druck', ziffer: 400, satz: 8.1 }],
      leistungen: ['Logo-Entwicklung', 'Fotoshooting halber Tag', 'Nutzungsrechte', 'Website Gestaltung'] },
    { id: 'gastro', name: 'Gastronomie und Food', icon: '🍽️', text: 'Restaurant, Catering, Foodtruck, Bäckerei',
      ziele: ['rechnungen', 'buchhaltung', 'lager', 'zeit'], mitarbeiter: true,
      kat: [{ id: 'b-lebensmittel', name: 'Lebensmittel', ziffer: 400, satz: 2.6 }, { id: 'b-getraenke', name: 'Getränke', ziffer: 400, satz: 8.1 }, { id: 'b-verpackung', name: 'Verpackung und Einweg', ziffer: 400, satz: 8.1 }],
      leistungen: ['Catering 40 Personen', 'Apéro riche', 'Servicepersonal'] },
    { id: 'handel', name: 'Handel und Onlineshop', icon: '🛍️', text: 'Laden, Onlineshop, Import',
      ziele: ['rechnungen', 'buchhaltung', 'lager'], mitarbeiter: false,
      kat: [{ id: 'b-ware', name: 'Wareneinkauf', ziffer: 400, satz: 8.1 }, { id: 'b-versand', name: 'Versand und Porto', ziffer: 405, satz: 8.1 }, { id: 'b-shop', name: 'Shop-Gebühren und Zahlungsanbieter', ziffer: 405, satz: 0 }, { id: 'b-zoll', name: 'Zoll und Einfuhr', ziffer: 400, satz: 0 }],
      leistungen: ['Artikel gemäss Bestellung', 'Versandkosten'] },
    { id: 'transport', name: 'Transport und Umzug', icon: '🚚', text: 'Kurier, Umzug, Taxi, Fahrschule',
      ziele: ['rechnungen', 'buchhaltung', 'zeit', 'termine'], mitarbeiter: true,
      kat: [{ id: 'b-treibstoff', name: 'Treibstoff', ziffer: 405, satz: 8.1 }, { id: 'b-maut', name: 'Vignette, Parkgebühren, LSVA', ziffer: 405, satz: 0 }, { id: 'b-fahrzeugmiete', name: 'Fahrzeugmiete', ziffer: 405, satz: 8.1 }],
      leistungen: ['Umzug pauschal', 'Kurierfahrt Zürich–Bern', 'Fahrstunde 45 Min.'] },
    { id: 'bildung', name: 'Unterricht und Kurse', icon: '📚', text: 'Nachhilfe, Musik, Sport, Kurse',
      ziele: ['termine', 'rechnungen', 'buchhaltung'], mitarbeiter: false,
      kat: [{ id: 'b-raummiete', name: 'Raummiete pro Kurs', ziffer: 405, satz: 0 }, { id: 'b-unterlagen', name: 'Kursunterlagen', ziffer: 400, satz: 2.6 }],
      leistungen: ['Lektion 60 Minuten', 'Kurs 8 Abende', 'Probelektion'] },
    { id: 'verein', name: 'Verein und Non-Profit', icon: '🤝', text: 'Sportverein, Kultur, Stiftung',
      ziele: ['rechnungen', 'buchhaltung', 'termine'], mitarbeiter: false,
      kat: [{ id: 'b-anlaesse', name: 'Anlässe und Veranstaltungen', ziffer: 405, satz: 8.1 }, { id: 'b-verbandsbeitraege', name: 'Verbandsbeiträge', ziffer: 405, satz: 0 }],
      leistungen: ['Mitgliederbeitrag 2027', 'Teilnahme Anlass', 'Spende'] },
    { id: 'andere', name: 'Andere', icon: '✨', text: 'Etwas anderes',
      ziele: ['rechnungen', 'buchhaltung'], mitarbeiter: false, kat: [], leistungen: ['Dienstleistung gemäss Offerte'] },
  ];
  // Konto im KMU-Kontenrahmen für die doppelte Buchhaltung
  const KONTO = { 'b-mietgeraete': '6100', 'b-entsorgung': '6400', 'b-arbeitskleider': '5800', 'b-pflanzen': '4000', 'b-reinigungsmittel': '4000',
    'b-produkte': '4200', 'b-verbrauch': '4000', 'b-waesche': '6100', 'b-praxis': '4000', 'b-supervision': '6500', 'b-fachliteratur': '6500', 'b-coworking': '6000',
    'b-ausruestung': '6100', 'b-bildrechte': '6570', 'b-druck': '4400', 'b-lebensmittel': '4000', 'b-getraenke': '4200', 'b-verpackung': '4000',
    'b-ware': '4200', 'b-versand': '6500', 'b-shop': '6940', 'b-zoll': '4200', 'b-treibstoff': '6200', 'b-maut': '6200', 'b-fahrzeugmiete': '6200',
    'b-raummiete': '6000', 'b-unterlagen': '4000', 'b-anlaesse': '6600', 'b-verbandsbeitraege': '6500' };
  const konto = (kategorie) => KONTO[kategorie] || null;
  const finde = (id) => B.find((b) => b.id === id) || null;
  // Gewählte Branche: aus der Lizenz, sonst auf diesem Gerät
  function aktuell() {
    const l = window.NASUVIA_LIZENZ;
    if (l && l.branche && finde(l.branche)) return l.branche;
    try { const b = localStorage.getItem('ordasio.branche'); return finde(b) ? b : ''; } catch { return ''; }
  }
  function setzen(id) {
    try { localStorage.setItem('ordasio.branche', id || ''); } catch {}
    if (window.NASUVIA_LIZENZ) window.NASUVIA_LIZENZ.branche = id || null;
    try { window.NASUVIA_SB && window.NASUVIA_SB.rpc('branche_setzen', { p_branche: id || '' }); } catch {}
  }

  // Paketempfehlung aus Rechtsform, Branche und Anzahl Mitarbeitende
  // antwort: { paket, gruende[], alternativ }
  function empfehlung({ rechtsform = 'einzel', branche = '', mitarbeiter = 0, buchhaltung = true } = {}) {
    const O = window.ORDASIO; if (!O) return null;
    const rf = O.RECHTSFORMEN[rechtsform] ? rechtsform : 'einzel';
    if (rf === 'privat') return { paket: 'privat', gruende: ['Für Ihre privaten Finanzen reicht das Home-Büro.'] };
    const br = finde(branche), firma = O.basis(rf) === 'gmbh', gruende = [];
    let id;
    if (mitarbeiter > 0) { id = firma ? 'business_team' : 'team'; gruende.push('Mit Mitarbeitenden brauchen Sie Zeiterfassung, Einsatzplanung und Lohnabrechnung.'); }
    else if (firma) { id = 'business'; gruende.push(`Als ${O.RECHTSFORMEN[rf].name} führen Sie die doppelte Buchhaltung mit Bilanz und Erfolgsrechnung.`); }
    else if (!buchhaltung) { id = 'start'; gruende.push('Sie brauchen vor allem Rechnungen. Die Buchhaltung macht Ihr Treuhänder.'); }
    else { id = 'solo'; gruende.push('Rechnungen und eine einfache Buchhaltung für die Steuererklärung.'); }
    const teamName = (O.paket(firma ? 'business_team' : 'team') || {}).name;
    if (br) {
      if (br.ziele.includes('termine')) gruende.push(`Für ${br.name}: Kunden buchen Termine online selbst, in jedem Paket enthalten.`);
      if (br.ziele.includes('lager') && !mitarbeiter) gruende.push(`Lager und Material gibt es im Paket ${teamName}, falls Sie es später brauchen.`);
      if (br.mitarbeiter && !mitarbeiter) gruende.push(`Sobald Mitarbeitende dazukommen, wechseln Sie mit einem Klick ins Paket ${teamName}.`);
    }
    const p = O.paket(id);
    if (p && p.mitarbeiter && mitarbeiter > p.mitarbeiter) gruende.push(`${p.mitarbeiter} Mitarbeitende sind inklusive, jede weitere Person kostet CHF ${O.ZUSATZ_MITARBEITER.monat} im Monat.`);
    return { paket: id, gruende };
  }

  window.Branchen = { LISTE: B, konto, finde, aktuell, setzen, empfehlung };
})();
