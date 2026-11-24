// Rechtsformen und Pakete von Ordasio: eine Quelle für Anmeldung, Lizenz-Seite, Startseite und Programme.
// Preise in CHF (exkl. MWST), jährlich = 10 Monatspreise (2 Monate gratis).
// programme: welche Bereiche das Paket öffnet (Namen wie data-produkt in lizenz.js; „lohn“ ist die Lohnabrechnung in der Buchhaltung).
(() => {
  const RECHTSFORMEN = {
    // basis: welche Pakete passen (einzel = Personenunternehmen, gmbh = Kapitalgesellschaft)
    // doppeltPflicht: doppelte Buchhaltung immer an; person: Inhaber mit Privatkonto statt Gewinnreserven; kapital: Name des Grundkapitals
    einzel: { name: 'Einzelunternehmen', kurz: 'Einzelfirma', text: 'Selbständig, Einzelfirma, auch nebenberuflich', basis: 'einzel', person: true },
    klg: { name: 'Kollektivgesellschaft', kurz: 'KlG', text: 'Zwei oder mehr Personen führen das Geschäft gemeinsam', basis: 'einzel', person: true },
    gmbh: { name: 'GmbH', kurz: 'GmbH', text: 'Gesellschaft mit beschränkter Haftung', basis: 'gmbh', doppeltPflicht: true, kapital: 'Stammkapital' },
    ag: { name: 'AG', kurz: 'AG', text: 'Aktiengesellschaft', basis: 'gmbh', doppeltPflicht: true, kapital: 'Aktienkapital' },
    genossenschaft: { name: 'Genossenschaft', kurz: 'Genossenschaft', text: 'Gemeinsam getragene Firma', basis: 'gmbh', doppeltPflicht: true, kapital: 'Genossenschaftskapital' },
    verein: { name: 'Verein oder Stiftung', kurz: 'Verein', text: 'Verein, Stiftung, Non-Profit', basis: 'einzel' },
    privat: { name: 'Privatperson', kurz: 'Privat', text: 'Nur private Finanzen (Home-Büro)', basis: 'privat' },
  };

  // Lizenzmodell (November 2026): wenige Hauptlizenzen, dazu kleine Zusatzpakete per Knopfdruck.
  // Preise in CHF exkl. MWST. Jahresabo = 10 Monatspreise (2 Monate gratis).
  // Hauptlizenzen: Start · Selbständig (Einzelfirma) · Business (GmbH/AG) · Home-Büro (privat)
  const PAKETE = [
    { id: 'start', name: 'Start', rechtsformen: ['einzel', 'gmbh', 'ag'], monat: 15, jahr: 150, mitarbeiter: 0,
      programme: ['start', 'rechnungen', 'termine', 'ablage', 'vorlagen'],
      kurz: 'Rechnungen, Offerten und Online-Termine',
      was: ['Unbegrenzt QR-Rechnungen, Offerten, Mahnungen', 'Sehen, wann der Kunde die Rechnung geöffnet hat', 'Abos und eigene Vorlagen', 'Online-Termine mit Kalender-Abo', 'Firmenablage mit eigenen Ordnern', 'Ihr Logo, Ihre Farben, Ihre Schrift'] },
    { id: 'solo', name: 'Selbständig', rechtsformen: ['einzel'], monat: 29, jahr: 290, mitarbeiter: 0, top: ['einzel'],
      programme: ['start', 'rechnungen', 'termine', 'ablage', 'vorlagen', 'buchhaltung', 'privat'],
      kurz: 'Rechnungen und Buchhaltung für Einzelfirmen',
      was: ['Alles aus Start', 'Buchhaltung ohne Fachbegriffe', 'Belege per Foto, automatisch gelesen', 'Bankauszug aller Schweizer Banken', 'MWST-Abrechnung und Jahresabschluss', 'Doppelte Buchhaltung zuschaltbar', 'Home-Büro und Treuhänder-Zugang gratis'] },
    { id: 'business', name: 'Business', rechtsformen: ['gmbh', 'ag'], monat: 39, jahr: 390, mitarbeiter: 0, top: ['gmbh', 'ag'],
      programme: ['start', 'rechnungen', 'termine', 'ablage', 'vorlagen', 'buchhaltung', 'privat'],
      kurz: 'Doppelte Buchhaltung für GmbH und AG',
      was: ['Alles aus Start', 'Doppelte Buchhaltung nach KMU-Kontenrahmen', 'Bilanz und Erfolgsrechnung nach OR', 'Belege per Foto, automatisch gelesen', 'Debitoren, Kreditoren, Eröffnungsbilanz', 'MWST-Abrechnung und Verbuchung', 'Treuhänder-Zugang mit Rückfragen und Export'] },
    { id: 'privat', name: 'Home-Büro', rechtsformen: ['privat'], monat: 4, jahr: 39, mitarbeiter: 0, top: ['privat'],
      programme: ['privat'],
      kurz: 'Private Finanzen',
      was: ['Kontoauszüge und Übersicht', 'Abos, Fixkosten und Bargeld', 'Rechnungen, Fristen, Betreibungen', 'Budget und Sparziele', 'Steuererklärung Schritt für Schritt'] },
    // Frühere Kombi-Pakete: Hauptlizenz plus Team, Löhne, Projekte & Lager (bestehende Kunden behalten ihren Preis)
    { id: 'team', name: 'Team', rechtsformen: ['einzel'], monat: 59, jahr: 590, mitarbeiter: 5, kombi: true, haupt: 'solo', module: ['team', 'lohn', 'projekte'],
      programme: ['start', 'rechnungen', 'termine', 'ablage', 'vorlagen', 'buchhaltung', 'privat', 'zeit', 'lohn', 'lager', 'projekte'],
      kurz: 'Selbständig mit Team, Löhnen und Lager', was: ['Alles aus Selbständig', 'Team & Zeit', 'Löhne', 'Projekte & Lager'] },
    { id: 'business_team', name: 'Business Team', rechtsformen: ['gmbh', 'ag'], monat: 69, jahr: 690, mitarbeiter: 5, kombi: true, haupt: 'business', module: ['team', 'lohn', 'projekte'],
      programme: ['start', 'rechnungen', 'termine', 'ablage', 'vorlagen', 'buchhaltung', 'privat', 'zeit', 'lohn', 'lager', 'projekte'],
      kurz: 'Business mit Team, Löhnen und Lager', was: ['Alles aus Business', 'Team & Zeit', 'Löhne', 'Projekte & Lager'] },
  ];
  // Frühere Paketnamen zeigen auf die neuen
  const FRUEHER = { rechnungen: 'start', buchhaltung: 'solo', kombi: 'team' };
  const ZUSATZ_MITARBEITER = { monat: 6, jahr: 60 };

  // Zusatzpakete: einzeln per Knopfdruck zu jeder passenden Hauptlizenz. Wenige, klar getrennte Pakete.
  // braucht: 'buchhaltung' = nur mit Selbständig oder Business. programme: welche Bereiche das Paket öffnet.
  const MODULE = [
    { id: 'team', name: 'Team & Zeit', icon: '⏱️', monat: 19, jahr: 190, programme: ['zeit'], mitarbeiter: 5,
      kurz: 'Zeiterfassung, Einsatzplan und Mitarbeiter-App',
      was: ['Zeiterfassung per Handy-Link, ohne Kosten pro Benutzer', 'Stempeluhr, Standort und Pausen nach Wahl', 'Einsatzplan mit Aufträgen und Kalender', 'Mitarbeiter-App: Plan, Stunden, Spesen, Lohnabrechnung', 'Personaldossiers, Mitteilungen, Ferienanträge', '5 Mitarbeitende inklusive, jede weitere CHF 6'],
      erklaerung: 'Jede Person bekommt einen eigenen Link aufs Handy, ohne Konto und ohne Passwort. Dort stempelt sie ein und aus, sieht ihren Einsatzplan, lädt Spesenbelege hoch und stellt Ferienanträge. Sie sehen alles live im Büro und machen aus den Stunden mit einem Klick Rapport, Rechnung oder Lohn.',
      fuer: ['handwerk', 'garten', 'gastro', 'gesundheit', 'transport', 'beauty'] },
    { id: 'lohn', name: 'Löhne', icon: '💸', monat: 12, jahr: 120, programme: ['lohn'], braucht: 'buchhaltung',
      kurz: 'Lohnabrechnung mit allen Abzügen',
      was: ['Lohnabrechnung mit AHV, ALV, BVG, UVG, KTG', 'Lohnausweis und Jahresübersicht', 'Löhne direkt in der Buchhaltung verbucht', 'Stunden aus der Zeiterfassung übernehmen'],
      erklaerung: 'Sie erfassen die Mitarbeitenden einmal. Jeden Monat erstellt Ordasio die Lohnabrechnungen mit allen Sozialabzügen, verbucht sie und erstellt am Jahresende den Lohnausweis.',
      fuer: ['handwerk', 'garten', 'gastro', 'gesundheit', 'transport', 'handel'] },
    { id: 'projekte', name: 'Projekte & Lager', icon: '📐', monat: 12, jahr: 120, programme: ['projekte', 'lager'],
      kurz: 'Projekte, Kostenstellen, Rapporte und Material',
      was: ['Projekte mit Budget, Stunden und Material', 'Kostenstellen in der Buchhaltung', 'Rapport mit Fotos und Unterschrift des Kunden', 'Aus dem Rapport direkt die Rechnung', 'Lager, Material und Bestellvorschläge an Lieferanten'],
      erklaerung: 'Legen Sie für jeden Auftrag ein Projekt an. Stunden, Material und Spesen laufen automatisch darauf. Auf der Baustelle unterschreibt der Kunde den Rapport auf dem Handy, im Büro wird daraus mit einem Klick die Rechnung. Sie sehen jederzeit, ob ein Projekt rentiert.',
      fuer: ['handwerk', 'garten', 'beratung', 'kreativ'] },
    { id: 'verkauf', name: 'Verkauf Plus', icon: '🚀', monat: 9, jahr: 90, programme: ['verkauf'],
      kurz: 'Offerten online annehmen, Mahnungen automatisch',
      was: ['Offerte per Link: der Kunde nimmt sie mit Unterschrift an', 'Zahlungserinnerungen gehen automatisch raus', 'Kundenportal mit allen Offerten und Rechnungen', 'Bestellungen aus Onlineshops (Shopify, WooCommerce) übernehmen'],
      erklaerung: 'Ihre Kunden erhalten Offerten und Rechnungen als Link. Eine Offerte nehmen sie mit einem Klick und ihrer Unterschrift an, daraus wird sofort ein Auftrag. Überfällige Rechnungen erinnert Ordasio freundlich und automatisch, ohne dass Sie daran denken müssen.',
      fuer: ['handwerk', 'garten', 'handel', 'beratung', 'kreativ'] },
    { id: 'finanzen', name: 'Finanzen Plus', icon: '📈', monat: 9, jahr: 90, programme: ['finanzen'], braucht: 'buchhaltung',
      kurz: 'Fremdwährungen und Liquiditätsvorschau',
      was: ['Rechnungen und Belege in EUR, USD und weiteren Währungen', 'Umrechnung in CHF mit Tageskurs', 'Liquiditätsvorschau der nächsten 12 Wochen', 'Warnung, bevor das Geld knapp wird'],
      erklaerung: 'Ordasio rechnet Fremdwährungen automatisch in Franken um und zeigt Kursgewinne und -verluste. Die Liquiditätsvorschau zählt Ihren Kontostand, offene Rechnungen, Löhne und feste Ausgaben zusammen und warnt Sie Wochen im Voraus.',
      fuer: ['handel', 'beratung', 'kreativ'] },
    { id: 'bewerbungen', name: 'Bewerbungen', icon: '🧑‍💼', monat: 9, jahr: 90, programme: ['bewerbungen'],
      kurz: 'Offene Stellen und Bewerbungs-Link',
      was: ['Offene Stellen mit passenden Berufen und Vorlagen', 'Eigener Bewerbungs-Link für Website und Inserate', 'Bewerbungen mit Unterlagen an einem Ort', 'Einladen oder absagen mit einem Klick'],
      erklaerung: 'Sie wählen einen Beruf, Ordasio schlägt Titel und Text vor. Den Link stellen Sie auf Ihre Website oder ins Inserat. Bewerbungen kommen mit Lebenslauf und Zeugnissen in Ordasio an, und Sie antworten mit einem Klick.',
      fuer: ['handwerk', 'garten', 'gastro', 'gesundheit', 'beauty', 'handel', 'transport'] },
  ];
  const modul = (id) => MODULE.find((m) => m.id === id) || null;
  // Kombi-Rabatt auf Zusatzpakete: ab 2 Paketen 10 %, ab 3 Paketen 25 %
  const KOMBI = [{ ab: 3, prozent: 25 }, { ab: 2, prozent: 10 }];
  const kombiProzent = (n) => (KOMBI.find((k) => n >= k.ab) || { prozent: 0 }).prozent;
  // Treue und Empfehlung
  const TREUE = { abJahr: 2, prozent: 10, text: 'Ab dem zweiten Jahr 10 % Treuerabatt auf alles.' };
  const EMPFEHLUNG = { monate: 1, text: 'Empfehlen Sie Ordasio weiter: Sie und die neue Firma erhalten je einen Monat gratis.' };
  // Ältere Zusatzoption (bis November 2026) zählt als Paket
  const ZUSATZ = MODULE;
  const EINRICHTUNG = 190;

  const paket = (id) => PAKETE.find((p) => p.id === (FRUEHER[id] || id)) || null;
  const basis = (rechtsform) => (RECHTSFORMEN[rechtsform] || RECHTSFORMEN.einzel).basis;
  const fuer = (rechtsform, mitKombi) => PAKETE.filter((p) => p.rechtsformen.includes(basis(rechtsform)) && (mitKombi || !p.kombi));
  const vorgabe = (rechtsform) => ({ einzel: 'solo', gmbh: 'business', privat: 'privat' }[basis(rechtsform)] || 'solo');
  // Passt ein Paket nicht zur Rechtsform, das entsprechende der anderen Seite nehmen
  function passend(id, rechtsform) {
    const p = paket(id);
    rechtsform = basis(rechtsform);
    if (p && p.rechtsformen.includes(rechtsform)) return p.id;
    const tausch = { solo: 'business', team: 'business_team', business: 'solo', business_team: 'team' }[p && p.id];
    const t = tausch && paket(tausch);
    return t && t.rechtsformen.includes(rechtsform) ? t.id : vorgabe(rechtsform);
  }
  // Gebuchte Zusatzpakete einer Lizenz (Objekt aus der Datenbank) – Kombi-Pakete zählen ihre Module mit
  const zusatzAn = (wert) => !!wert && wert !== false && !(typeof wert === 'object' && wert.an === false);
  function gebucht(l) {
    if (!l || typeof l !== 'object') return [];
    const p = paket(l.paket), z = l.zusatz || {};
    const liste = MODULE.filter((m) => zusatzAn(z[m.id])).map((m) => m.id);
    (p && p.module || []).forEach((m) => { if (!liste.includes(m)) liste.push(m); });
    return liste;
  }
  const hauptVon = (l) => { const p = paket(typeof l === 'object' && l ? l.paket : l); return p ? (p.haupt ? paket(p.haupt) : p) : null; };
  const kannBuchen = (l, modulId) => { const h = hauptVon(l), m = modul(modulId); if (!h || !m || h.id === 'privat') return false; return !m.braucht || h.programme.includes(m.braucht); };
  // Darf die Lizenz diesen Bereich öffnen? Erster Wert: Lizenz-Objekt (mit Zusatzpaketen) oder nur die Paket-ID.
  // Im Gratis-Test sind alle Zusatzpakete offen, die zur Hauptlizenz passen: so erleben Kunden alles.
  function darf(l, programm) {
    const p = paket(typeof l === 'object' && l ? l.paket : l);
    if (!p) return false;
    if (p.programme.includes(programm)) return true;
    if (typeof l !== 'object' || !l) return false;
    const m = MODULE.find((x) => x.programme.includes(programm));
    if (!m || !kannBuchen(l, m.id)) return false;
    return l.status === 'test' || gebucht(l).includes(m.id);
  }
  // Welches Zusatzpaket öffnet einen Bereich? (für „dazubuchen“-Hinweise)
  const modulFuer = (programm) => MODULE.find((m) => m.programme.includes(programm)) || null;
  // Preis einer Zusammenstellung
  function preis({ paket: pid, module = [], zyklus = 'monat', weitere = 0 } = {}) {
    const p = paket(pid), h = p && p.haupt ? paket(p.haupt) : p;
    if (!h) return null;
    const mods = [...new Set([...(p && p.module || []), ...module])].map(modul).filter(Boolean);
    // Frühere Kombi-Pakete behalten ihren festen Preis; nur weitere Pakete kommen dazu
    const fest = p && p.kombi ? p.module : [];
    const grund = fest.length ? (zyklus === 'jahr' ? p.jahr : p.monat) : (zyklus === 'jahr' ? h.jahr : h.monat);
    const zusatzVoll = mods.filter((m) => !fest.includes(m.id)).reduce((a, m) => a + (zyklus === 'jahr' ? m.jahr : m.monat), 0);
    const prozent = kombiProzent(mods.length);
    const zusatz = Math.round(zusatzVoll * (100 - prozent) / 100);
    const leute = Math.max(0, weitere) * (zyklus === 'jahr' ? ZUSATZ_MITARBEITER.jahr : ZUSATZ_MITARBEITER.monat);
    return { haupt: h, module: mods, grund, zusatzVoll, prozent, rabatt: zusatzVoll - zusatz, zusatz, leute, total: grund + zusatz + leute };
  }
  // Vorschläge: welche Zusatzpakete passen zu dieser Firma (Branche, Mitarbeitende), noch nicht gebucht
  function vorschlaege(l, { branche = '', mitarbeiter = 0 } = {}) {
    const hat = gebucht(l);
    return MODULE.filter((m) => !hat.includes(m.id) && kannBuchen(l, m.id))
      .map((m) => ({ m, punkte: (m.fuer.includes(branche) ? 3 : 0) + (mitarbeiter && ['team', 'lohn'].includes(m.id) ? 3 : 0) + (m.id === 'verkauf' ? 1 : 0) }))
      .sort((a, b) => b.punkte - a.punkte).map((x) => x.m);
  }
  // Kleinstes Paket der Rechtsform, das ein Programm enthält (für „ab Paket …“-Hinweise)
  const ab = (programm, rechtsform) => fuer(rechtsform).find((p) => p.programme.includes(programm)) || null;
  const doppelt = (rechtsform) => !!(RECHTSFORMEN[rechtsform] || {}).doppeltPflicht;

  window.ORDASIO = { RECHTSFORMEN, PAKETE, ZUSATZ, MODULE, KOMBI, TREUE, EMPFEHLUNG, basis, FRUEHER, ZUSATZ_MITARBEITER, EINRICHTUNG, paket, modul, fuer, vorgabe, passend, darf, ab, doppelt, gebucht, kannBuchen, hauptVon, modulFuer, preis, kombiProzent, vorschlaege };
})();
